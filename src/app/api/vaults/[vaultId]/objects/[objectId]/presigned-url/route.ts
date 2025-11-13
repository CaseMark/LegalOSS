import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * POST /api/vaults/[vaultId]/objects/[objectId]/presigned-url
 * Generate presigned URL for S3 operations (GET, PUT, DELETE, HEAD)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vaultId: string; objectId: string }> },
) {
  try {
    await requirePermission("vaults.download");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { vaultId, objectId } = await params;
    const body = await request.json();

    const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/objects/${objectId}/presigned-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Presigned URL failed: ${response.status} - ${errorText}`);
      return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 });
  }
}
