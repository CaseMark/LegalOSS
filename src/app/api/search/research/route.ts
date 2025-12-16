import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

export interface ResearchRequest {
  instructions: string;
  model?: string;
  outputFormat?: "markdown" | "json";
  outputSchema?: string;
}

export interface ResearchResponse {
  researchId: string;
  createdAt: number;
  model: string;
  instructions: string;
  status: "pending" | "running" | "completed" | "failed" | "canceled";
  output?: {
    content: string;
  };
  costDollars?: {
    total: number;
    numPages: number;
    numSearches: number;
  };
}

/**
 * POST /api/search/research - Start deep research via Case.dev
 */
export async function POST(req: Request) {
  try {
    await requirePermission("chat_ai.use");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const body: ResearchRequest = await req.json();

    if (!body.instructions) {
      return NextResponse.json({ error: "Instructions are required" }, { status: 400 });
    }

    const response = await fetch(`${CASE_API_URL}/search/v1/research`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify({
        instructions: body.instructions,
        model: body.model || "exa-research",
        outputFormat: body.outputFormat || "markdown",
        outputSchema: body.outputSchema,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Research failed" }));
      return NextResponse.json(
        { error: error.message || "Research failed", data: error.data },
        { status: response.status }
      );
    }

    const data: ResearchResponse = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Search Research API] Error:", error);
    return NextResponse.json({ error: "Research failed" }, { status: 500 });
  }
}

