import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * GET /api/search/research/[researchId] - Get research status via Case.dev
 */
export async function GET(req: Request, { params }: { params: Promise<{ researchId: string }> }) {
  try {
    await requirePermission("chat_ai.use");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { researchId } = await params;

    const response = await fetch(`${CASE_API_URL}/search/v1/research/${researchId}`, {
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to get research status" }));
      return NextResponse.json(
        { error: error.message || "Failed to get research status", data: error.data },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Search Research Status API] Error:", error);
    return NextResponse.json({ error: "Failed to get research status" }, { status: 500 });
  }
}
