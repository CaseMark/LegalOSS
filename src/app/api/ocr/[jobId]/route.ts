import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { ocrJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * GET /api/ocr/[jobId] - Get OCR job status and results
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    await requirePermission("ocr.read");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { jobId } = await params;

    // Fetch from Case.dev API for latest status
    const response = await fetch(`${CASE_API_URL}/ocr/v1/${jobId}`, {
      headers: { Authorization: `Bearer ${CASE_API_KEY}` },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to get OCR job status" }, { status: response.status });
    }

    const data = await response.json();

    // Update local database with latest status
    const db = await getDb();
    await db
      .update(ocrJobs)
      .set({
        status: data.status,
        pageCount: data.page_count || 0,
        chunkCount: data.chunk_count || 0,
        chunksCompleted: data.chunks_completed || 0,
        chunksProcessing: data.chunks_processing || 0,
        chunksFailed: data.chunks_failed || 0,
        confidence: data.confidence ? Math.round(data.confidence * 100) : null,
        textLength: data.text?.length || null,
        error: data.error || null,
        completedAt: data.status === "completed" ? new Date() : null,
      })
      .where(eq(ocrJobs.id, jobId));

    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error getting OCR job:", error);
    return NextResponse.json({ error: "Failed to get OCR job" }, { status: 500 });
  }
}
