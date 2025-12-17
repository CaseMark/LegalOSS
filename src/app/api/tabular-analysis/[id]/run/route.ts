import { eq, and } from "drizzle-orm";

import { getDb } from "@/db";
import { tabularAnalyses, tabularAnalysisRows, cases } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { caseClient } from "@/lib/case-dev";
import { extractCellValue } from "@/lib/tabular-analysis/cell-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for long extractions

// Shared handler for both GET (EventSource) and POST
async function runExtraction(id: string, userId: string) {
  const db = await getDb();

  // Get the analysis
  const [analysis] = await db
    .select()
    .from(tabularAnalyses)
    .where(and(eq(tabularAnalyses.id, id), eq(tabularAnalyses.userId, userId)))
    .limit(1);

  if (!analysis) {
    return new Response("Not found", { status: 404 });
  }

  // Parse columns from JSON
  const columns = JSON.parse(analysis.columns || "[]");
  if (columns.length === 0) {
    return new Response("Add columns before running extraction", {
      status: 400,
    });
  }

  // Get vault ID from analysis
  const vaultId = analysis.vaultId;
  if (!vaultId) {
    return new Response("No vault associated with this analysis", { status: 400 });
  }

  // Parse documentIds from JSON
  const documentIds = JSON.parse(analysis.documentIds || "[]") as string[];

  // Get document titles from Case.dev vault (documentIds are vault object IDs)
  const docMap = new Map<string, { id: string; title: string }>();
  try {
    const vaultObjects = await caseClient.vaults.listObjects(vaultId);
    for (const obj of vaultObjects) {
      if (documentIds.includes(obj.id)) {
        docMap.set(obj.id, { id: obj.id, title: obj.filename });
      }
    }
  } catch (e) {
    console.error("[run] Failed to fetch vault objects:", e);
    return new Response("Failed to fetch documents", { status: 500 });
  }

  // Update status to processing
  await db
    .update(tabularAnalyses)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(tabularAnalyses.id, id));

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const sortedColumns = [...columns].sort((a: any, b: any) => a.order - b.order);

        let completedCells = 0;
        const totalCells = documentIds.length * sortedColumns.length;

        // Process each document (row) - documentIds are vault object IDs
        for (const documentId of documentIds) {
          const doc = docMap.get(documentId);
          if (!doc) {
            sendEvent({
              type: "error",
              documentId,
              message: "Document not found in vault",
            });
            continue;
          }

          // Process each column for this document
          for (let colIdx = 0; colIdx < sortedColumns.length; colIdx++) {
            const column = sortedColumns[colIdx];

            sendEvent({
              type: "progress",
              documentId,
              columnId: column.id,
              message: "Extracting...",
            });

            // Get dependencies (values from columns to the left)
            let deps: Record<string, unknown> | undefined;
            if (colIdx > 0) {
              const [existingRow] = await db
                .select()
                .from(tabularAnalysisRows)
                .where(and(eq(tabularAnalysisRows.analysisId, id), eq(tabularAnalysisRows.documentId, documentId)))
                .limit(1);

              if (existingRow?.data) {
                const parsedData = JSON.parse(existingRow.data);
                deps = {};
                for (let j = 0; j < colIdx; j++) {
                  const leftCol = sortedColumns[j];
                  const leftData = parsedData[leftCol.id];
                  if (leftData) deps[leftCol.name] = leftData.value;
                }
              }
            }

            try {
              // Use column-specific model if set, otherwise fall back to analysis default
              const modelToUse = column.modelId || analysis.modelId || "anthropic/claude-sonnet-4.5";

              // Extract the cell value - documentId IS the vault object ID
              const cellValue = await extractCellValue(
                documentId,
                doc.title,
                column,
                vaultId,
                deps,
                modelToUse,
                async (msg) => {
                  sendEvent({
                    type: "progress",
                    documentId,
                    columnId: column.id,
                    message: msg,
                  });
                },
              );

              // Save to database (upsert)
              const existingRows = await db
                .select()
                .from(tabularAnalysisRows)
                .where(and(eq(tabularAnalysisRows.analysisId, id), eq(tabularAnalysisRows.documentId, documentId)))
                .limit(1);

              if (existingRows.length > 0) {
                // Update existing row
                const existingData = JSON.parse(existingRows[0].data || "{}");
                const newData = { ...existingData, [column.id]: cellValue };
                await db
                  .update(tabularAnalysisRows)
                  .set({
                    data: JSON.stringify(newData),
                    tokensUsed: (existingRows[0].tokensUsed || 0) + (cellValue.tokensUsed || 0),
                    extractedAt: new Date(),
                  })
                  .where(eq(tabularAnalysisRows.id, existingRows[0].id));
              } else {
                // Insert new row
                await db.insert(tabularAnalysisRows).values({
                  id: crypto.randomUUID(),
                  analysisId: id,
                  documentId,
                  data: JSON.stringify({ [column.id]: cellValue }),
                  tokensUsed: cellValue.tokensUsed || 0,
                  extractedAt: new Date(),
                });
              }

              completedCells++;

              sendEvent({
                type: "complete",
                documentId,
                columnId: column.id,
                value: cellValue,
                progress: Math.round((completedCells / totalCells) * 100),
              });
            } catch (cellError) {
              console.error("[run] Cell extraction failed:", cellError);
              sendEvent({
                type: "error",
                documentId,
                columnId: column.id,
                message: cellError instanceof Error ? cellError.message : "Extraction failed",
              });
            }
          }
        }

        // Update status to completed
        await db
          .update(tabularAnalyses)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(tabularAnalyses.id, id));

        sendEvent({
          type: "done",
          totalCells,
          completedCells,
        });

        controller.close();
      } catch (error) {
        console.error("[run] Stream error:", error);

        // Update status to failed
        await db
          .update(tabularAnalyses)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(tabularAnalyses.id, id));

        sendEvent({
          type: "error",
          message: error instanceof Error ? error.message : "Extraction failed",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// GET - Run extraction (for EventSource which only supports GET)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }
    const { id } = await params;
    return runExtraction(id, user.id);
  } catch (error) {
    console.error("[tabular-analysis] Run failed:", error);
    return new Response("Failed to start extraction", { status: 500 });
  }
}

// POST - Run extraction (alternative method)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }
    const { id } = await params;
    return runExtraction(id, user.id);
  } catch (error) {
    console.error("[tabular-analysis] Run failed:", error);
    return new Response("Failed to start extraction", { status: 500 });
  }
}
