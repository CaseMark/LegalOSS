import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * POST /api/vaults/[vaultId]/upload-file
 * Full upload proxy - handles getting presigned URL AND uploading to S3
 * Solves CORS issues with direct S3 uploads
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ vaultId: string }> }) {
  try {
    await requirePermission("vaults.upload");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { vaultId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(`[Upload] Uploading ${file.name} (${file.size} bytes) to vault ${vaultId}`);

    // Step 1: Get presigned upload URL from Case.dev
    const uploadUrlResponse = await fetch(`${CASE_API_URL}/vault/${vaultId}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
      }),
    });

    if (!uploadUrlResponse.ok) {
      const error = await uploadUrlResponse.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || "Failed to get upload URL");
    }

    const { uploadUrl, objectId } = await uploadUrlResponse.json();

    // Step 2: Upload to S3 (server-side, no CORS issues)
    const fileBuffer = await file.arrayBuffer();
    const s3Response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: fileBuffer,
    });

    if (!s3Response.ok) {
      const errorText = await s3Response.text();
      console.error("[Upload] S3 upload failed:", errorText);
      throw new Error(`S3 upload failed: ${s3Response.status}`);
    }

    console.log(`[Upload] ✓ Successfully uploaded ${file.name}`);

    return NextResponse.json({
      success: true,
      objectId,
      filename: file.name,
      size: file.size,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Upload] Upload failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 },
    );
  }
}
