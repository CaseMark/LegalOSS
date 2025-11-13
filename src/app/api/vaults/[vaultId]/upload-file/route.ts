import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vaultObjects } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    console.log(`[Upload Proxy] Uploading ${file.name} (${file.size} bytes) to vault ${vaultId}`);

    // Step 1: Get presigned upload URL
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
      throw new Error("Failed to get upload URL");
    }

    const { uploadUrl, objectId } = await uploadUrlResponse.json();
    console.log(`[Upload Proxy] Got presigned URL for object ${objectId}`);

    // Step 2: Upload to S3 (server-side, no CORS issues)
    const fileBuffer = await file.arrayBuffer();
    const s3Response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: fileBuffer,
    });

    console.log(`[Upload Proxy] S3 response: ${s3Response.status}`);

    if (!s3Response.ok) {
      const errorText = await s3Response.text();
      console.error("[Upload Proxy] S3 upload failed:", errorText);
      throw new Error(`S3 upload failed: ${s3Response.status}`);
    }

    console.log(`[Upload Proxy] ✓ Successfully uploaded ${file.name} to S3`);

    // Step 3: Save to local database with ACTUAL file size
    try {
      await db
        .insert(vaultObjects)
        .values({
          id: objectId,
          vaultId,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size, // Use actual file size from upload
          status: "processing", // Ingestion will be triggered
          uploadedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: vaultObjects.id,
          set: {
            size: file.size,
            status: "processing",
          },
        });
      console.log(`[Upload Proxy] ✓ Saved to local DB with size: ${file.size} bytes`);
    } catch (dbError) {
      console.warn("[Upload Proxy] Failed to save to local DB:", dbError);
    }

    // Step 4: Auto-ingestion disabled - user will manually trigger via "Ingest All" button
    // This gives users control over when and how (standard vs GraphRAG) to index files
    console.log(`[Upload Proxy] ✓ File uploaded. Use "Ingest All" button to index for search.`);

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
    console.error("[Upload Proxy] Upload failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 },
    );
  }
}
