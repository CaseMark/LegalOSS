import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

export interface SearchRequest {
  query: string;
  numResults?: number;
  type?: "neural" | "fast" | "auto" | "deep";
  category?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
}

export interface SearchResponse {
  requestId: string;
  resolvedSearchType: string;
  results: SearchResult[];
  costDollars: {
    total: number;
    search: Record<string, number>;
  };
}

/**
 * POST /api/search - Perform web search via Case.dev
 */
export async function POST(req: Request) {
  try {
    await requirePermission("chat_ai.use");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const body: SearchRequest = await req.json();

    if (!body.query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const response = await fetch(`${CASE_API_URL}/search/v1/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify({
        query: body.query,
        numResults: body.numResults || 10,
        type: body.type || "auto",
        category: body.category,
        includeDomains: body.includeDomains,
        excludeDomains: body.excludeDomains,
        startPublishedDate: body.startPublishedDate,
        endPublishedDate: body.endPublishedDate,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Search failed" }));
      return NextResponse.json(
        { error: error.message || "Search failed", data: error.data },
        { status: response.status },
      );
    }

    const data: SearchResponse = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Search API] Error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
