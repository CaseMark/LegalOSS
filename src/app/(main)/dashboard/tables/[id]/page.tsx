import { redirect, notFound } from "next/navigation";

import { eq, and } from "drizzle-orm";

import { SpreadsheetView } from "@/components/tables/spreadsheet-view";
import { getDb } from "@/db";
import { tabularAnalyses, tabularAnalysisRows, cases } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { caseClient } from "@/lib/case-dev";

export default async function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/v2/login");
  }

  const db = await getDb();
  const { id } = await params;

  // Get the analysis
  const [analysis] = await db
    .select()
    .from(tabularAnalyses)
    .where(and(eq(tabularAnalyses.id, id), eq(tabularAnalyses.userId, user.id)))
    .limit(1);

  if (!analysis) {
    notFound();
  }

  // Get case info if linked
  let caseInfo: { id: string; name: string } | null = null;
  const vaultId: string | null = analysis.vaultId;

  if (analysis.caseId) {
    const [caseResult] = await db
      .select({ id: cases.id, name: cases.title })
      .from(cases)
      .where(eq(cases.id, analysis.caseId))
      .limit(1);

    if (caseResult) {
      caseInfo = { id: caseResult.id, name: caseResult.name };
    }
  }

  // Get all rows for this analysis
  const rows = await db.select().from(tabularAnalysisRows).where(eq(tabularAnalysisRows.analysisId, id));

  // Get document titles from Case.dev vault
  let docTitles: Record<string, string> = {};
  if (vaultId) {
    try {
      const vaultObjects = await caseClient.vaults.listObjects(vaultId);
      docTitles = Object.fromEntries(vaultObjects.map((obj: any) => [obj.id, obj.filename]));
    } catch (e) {
      console.error("Failed to fetch vault objects:", e);
    }
  }

  // Parse document IDs from JSON
  const documentIds = JSON.parse(analysis.documentIds || "[]") as string[];

  // Build documents list with titles for all selected documents
  const documents = documentIds.map((docId) => ({
    id: docId,
    title: docTitles[docId] || "Unknown Document",
  }));

  // Parse columns from JSON
  const columns = JSON.parse(analysis.columns || "[]");

  const analysisWithRows = {
    ...analysis,
    documentIds,
    columns,
    documents,
    rows: rows.map((r) => ({
      ...r,
      data: JSON.parse(r.data || "{}"),
      documentTitle: docTitles[r.documentId] || "Unknown",
    })),
    matter: caseInfo,
    vaultId,
  } as any; // Type assertion to avoid complex type mismatch

  return <SpreadsheetView analysis={analysisWithRows} />;
}
