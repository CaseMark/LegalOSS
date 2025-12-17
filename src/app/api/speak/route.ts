import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * POST /api/speak - Text-to-speech synthesis
 */
export async function POST(request: NextRequest) {
  try {
    await requirePermission("tts.use");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const body = await request.json();

    console.log("[TTS] Generating speech:", {
      textLength: body.text?.length,
      voiceId: body.voice_id,
      modelId: body.model_id,
    });

    const response = await fetch(`${CASE_API_URL}/voice/v1/speak`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      console.error("[TTS] Error:", error);
      return NextResponse.json({ error: error.message || "Failed to generate speech" }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[TTS] ✓ Generated ${audioBuffer.byteLength} bytes of audio`);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[TTS] Error:", error);
    return NextResponse.json({ error: "Failed to generate speech" }, { status: 500 });
  }
}
