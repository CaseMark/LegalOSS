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
      console.error("[Ingest] CASE_API_KEY not configured");
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { vaultId, objectId } = await params;
    const body = await request.json().catch(() => ({}));
    const { enable_graphrag = false } = body;

    console.log(`[Ingest] Triggering ingestion for vault=${vaultId}, object=${objectId}, graphrag=${enable_graphrag}`);

    const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/ingest/${objectId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify({ enable_graphrag }),
    });

    const responseText = await response.text();
    console.log(`[Ingest] Case.dev response status: ${response.status}, body: ${responseText}`);

    if (!response.ok) {
      let errorMessage = "Failed to trigger ingestion";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }
      console.error(`[Ingest] Error: ${errorMessage}`);
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const data = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Ingest] Error triggering ingestion:", error);
    return NextResponse.json({ error: error.message || "Failed to trigger ingestion" }, { status: 500 });
  }
}
