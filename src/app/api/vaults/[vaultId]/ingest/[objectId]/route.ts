import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * POST /api/vaults/[vaultId]/ingest/[objectId] - Trigger OCR processing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vaultId: string; objectId: string }> },
) {
  try {
    await requirePermission("vaults.upload");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { vaultId, objectId } = await params;
    const body = await request.json().catch(() => ({}));
    const { enable_graphrag = false } = body;

    const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/ingest/${objectId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify({ enable_graphrag }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      return NextResponse.json({ error: error.message || "Failed to trigger ingestion" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error triggering ingestion:", error);
    return NextResponse.json({ error: "Failed to trigger ingestion" }, { status: 500 });
  }
}
