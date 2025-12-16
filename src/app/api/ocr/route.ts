import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { ocrJobs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * GET /api/ocr - List all OCR jobs from local database
 */
export async function GET() {
  try {
    await requirePermission("ocr.read");

    const db = await getDb();
    const jobs = await db.select().from(ocrJobs).orderBy(desc(ocrJobs.createdAt));
    return NextResponse.json({ jobs });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error listing OCR jobs:", error);
    return NextResponse.json({ error: "Failed to list OCR jobs" }, { status: 500 });
  }
}

/**
 * POST /api/ocr - Submit document for OCR processing
 * Supports two modes:
 * 1. Direct file upload (provide file URL)
 * 2. From vault (provide vaultId + objectId)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("ocr.create");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { documentUrl, filename, vaultId, objectId, engine = "doctr", features = {} } = body;

    // Validate: either documentUrl OR (vaultId + objectId)
    if (!documentUrl && (!vaultId || !objectId)) {
      return NextResponse.json({ error: "Either documentUrl or (vaultId + objectId) is required" }, { status: 400 });
    }

    // If using vault, get the document URL from vault object
    let finalDocumentUrl = documentUrl;
    let finalFilename = filename;

    if (vaultId && objectId && !documentUrl) {
      console.log(`Getting download URL for vault ${vaultId}, object ${objectId}`);

      // Get object metadata which includes downloadUrl
      const objectResponse = await fetch(`${CASE_API_URL}/vault/${vaultId}/objects/${objectId}`, {
        headers: { Authorization: `Bearer ${CASE_API_KEY}` },
      });

      if (!objectResponse.ok) {
        const errorText = await objectResponse.text();
        console.error("Failed to get vault object:", errorText);
        return NextResponse.json(
          { error: `Failed to get vault object: ${objectResponse.status}` },
          { status: objectResponse.status },
        );
      }

      const objData = await objectResponse.json();

      // Use the downloadUrl from the object (Case.dev generates presigned URLs)
      finalDocumentUrl = objData.downloadUrl;
      finalFilename = objData.filename || filename || "document.pdf";

      console.log("Got download URL for OCR:", finalDocumentUrl?.substring(0, 100) + "...");
      console.log("File size:", objData.sizeBytes, "bytes");

      // Warn if file is empty but allow OCR to try (it will fail with better error)
      if (!objData.sizeBytes || objData.sizeBytes === 0) {
        console.warn("⚠️  Warning: File shows 0 bytes - upload may have failed. Attempting OCR anyway...");
      }
    }

    if (!finalDocumentUrl) {
      return NextResponse.json({ error: "Could not determine document URL" }, { status: 400 });
    }

    // Submit to Case.dev OCR API
    // Note: For vault-based jobs, we skip 'embed' feature because Vision can't write
    // searchable PDFs back to vault buckets (permission issue).
    // The text extraction still works and gets stored in Vision's bucket.
    const cleanedFeatures = vaultId ? {} : features;

    const ocrPayload: any = {
      document_url: finalDocumentUrl,
      document_id: `ocr-${Date.now()}`,
      engine,
      features: cleanedFeatures,
    };

    console.log("Submitting OCR job:", {
      engine: ocrPayload.engine,
      features: Object.keys(cleanedFeatures),
      vaultId: vaultId || "none",
      objectId: objectId || "none",
      note: vaultId ? "Vault-based: embed feature disabled" : "Direct URL: all features enabled",
    });

    const response = await fetch(`${CASE_API_URL}/ocr/v1/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify(ocrPayload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      return NextResponse.json({ error: error.message || "Failed to submit OCR job" }, { status: response.status });
    }

    const data = await response.json();

    // Save to local database
    const db = await getDb();
    await db.insert(ocrJobs).values({
      id: data.id,
      userId: user.id,
      documentId: data.document_id,
      vaultId: vaultId || null,
      objectId: objectId || null,
      filename: finalFilename || "Unknown",
      documentUrl: finalDocumentUrl,
      engine,
      status: data.status || "pending",
      pageCount: data.page_count || 0,
      chunkCount: data.chunk_count || 0,
      chunksCompleted: data.chunks_completed || 0,
      chunksProcessing: data.chunks_processing || 0,
      chunksFailed: data.chunks_failed || 0,
      createdAt: new Date(),
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error submitting OCR job:", error);
    return NextResponse.json({ error: "Failed to submit OCR job" }, { status: 500 });
  }
}
