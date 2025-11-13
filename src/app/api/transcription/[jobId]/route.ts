import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transcriptionJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * GET /api/transcription/[jobId] - Get transcription job status
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    await requirePermission("transcription.read");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { jobId } = await params;

    // Fetch latest status from Case.dev
    const response = await fetch(`${CASE_API_URL}/voice/transcription/${jobId}`, {
      headers: { Authorization: `Bearer ${CASE_API_KEY}` },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to get transcription status" }, { status: response.status });
    }

    const data = await response.json();

    // Update local database
    await db
      .update(transcriptionJobs)
      .set({
        status: data.status,
        audioDuration: data.audio_duration,
        confidence: data.confidence ? Math.round(data.confidence * 100) : null,
        wordCount: data.words?.length || null,
        error: data.error || null,
        completedAt: data.status === "completed" ? new Date() : null,
      })
      .where(eq(transcriptionJobs.id, jobId));

    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error getting transcription:", error);
    return NextResponse.json({ error: "Failed to get transcription" }, { status: 500 });
  }
}
