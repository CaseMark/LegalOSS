import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

export interface AnswerRequest {
  query: string;
  model?: string;
  systemPrompt?: string;
  numResults?: number;
}

/**
 * POST /api/search/answer - Generate AI answer from search via Case.dev
 */
export async function POST(req: Request) {
  try {
    await requirePermission("chat_ai.use");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const body: AnswerRequest = await req.json();

    if (!body.query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const response = await fetch(`${CASE_API_URL}/search/v1/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify({
        query: body.query,
        model: body.model,
        systemPrompt: body.systemPrompt,
        numResults: body.numResults || 10,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Answer generation failed" }));
      return NextResponse.json(
        { error: error.message || "Answer generation failed", data: error.data },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Search Answer API] Error:", error);
    return NextResponse.json({ error: "Answer generation failed" }, { status: 500 });
  }
}
