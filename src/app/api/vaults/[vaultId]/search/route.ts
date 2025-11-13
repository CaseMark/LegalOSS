import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * POST /api/vaults/[vaultId]/search - Search documents in vault
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ vaultId: string }> }) {
  try {
    await requirePermission("vaults.search");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { vaultId } = await params;
    const body = await request.json();
    const { query, method = "hybrid", topK = 10 } = body;

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    // Validate method
    const validMethods = ["fast", "hybrid", "entity", "global", "local"];
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: `Invalid method. Must be one of: ${validMethods.join(", ")}` },
        { status: 400 },
      );
    }

    const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify({ query, method, topK }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      return NextResponse.json({ error: error.message || "Failed to search" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error searching vault:", error);
    return NextResponse.json({ error: "Failed to search vault" }, { status: 500 });
  }
}
