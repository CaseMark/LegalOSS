import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transcriptionJobs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * GET /api/transcription - List all transcription jobs
 */
export async function GET() {
  try {
    await requirePermission("transcription.read");

    const jobs = await db.select().from(transcriptionJobs).orderBy(desc(transcriptionJobs.createdAt));
    return NextResponse.json({ jobs });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error listing transcription jobs:", error);
    return NextResponse.json({ error: "Failed to list jobs" }, { status: 500 });
  }
}

/**
 * POST /api/transcription - Submit audio for transcription
 * Supports: audio URL or vault file
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("transcription.create");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const body = await request.json();
    const {
      audioUrl,
      filename,
      vaultId,
      objectId,
      languageCode = "en",
      speakerLabels = true,
      punctuate = true,
      formatText = true,
      autoChapters = false,
      summarization = false,
      redactPii = false,
      wordBoost = [],
    } = body;

    // Get audio URL from vault if needed
    let finalAudioUrl = audioUrl;
    let finalFilename = filename;

    if (vaultId && objectId && !audioUrl) {
      console.log(`Getting audio URL from vault ${vaultId}, object ${objectId}`);

      const objectResponse = await fetch(`${CASE_API_URL}/vault/${vaultId}/objects/${objectId}`, {
        headers: { Authorization: `Bearer ${CASE_API_KEY}` },
      });

      if (!objectResponse.ok) {
        return NextResponse.json({ error: "Failed to get vault object" }, { status: objectResponse.status });
      }

      const objData = await objectResponse.json();
      finalAudioUrl = objData.downloadUrl;
      finalFilename = objData.filename || filename;

      console.log("Got audio URL from vault");
    }

    if (!finalAudioUrl) {
      return NextResponse.json({ error: "audio_url or (vaultId + objectId) required" }, { status: 400 });
    }

    // Submit to Case.dev transcription API
    const transcriptionPayload = {
      audio_url: finalAudioUrl,
      language_code: languageCode,
      speaker_labels: speakerLabels,
      punctuate,
      format_text: formatText,
      auto_chapters: autoChapters,
      summarization,
      redact_pii: redactPii,
      ...(wordBoost.length > 0 && { word_boost: wordBoost }),
    };

    console.log("Submitting transcription:", {
      filename: finalFilename,
      languageCode,
      speakerLabels,
      vaultBased: !!vaultId,
    });

    const response = await fetch(`${CASE_API_URL}/voice/transcription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify(transcriptionPayload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      return NextResponse.json(
        { error: error.message || "Failed to submit transcription" },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Save to local database
    await db.insert(transcriptionJobs).values({
      id: data.id,
      userId: user.id,
      filename: finalFilename || "audio recording",
      audioUrl: finalAudioUrl,
      languageCode,
      speakerLabels,
      status: data.status || "queued",
      createdAt: new Date(),
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error submitting transcription:", error);
    return NextResponse.json({ error: "Failed to submit transcription" }, { status: 500 });
  }
}
