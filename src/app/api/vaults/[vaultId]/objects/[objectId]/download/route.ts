import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * GET /api/vaults/[vaultId]/objects/[objectId]/download - Download file from vault
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vaultId: string; objectId: string }> },
) {
  try {
    await requirePermission("vaults.download");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { vaultId, objectId } = await params;

    // Fetch file from Case.dev API
    const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/objects/${objectId}/download`, {
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`Download failed: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Failed to download file: ${response.status}`, details: errorText },
        { status: response.status },
      );
    }

    // Get filename from headers if available
    const contentDisposition = response.headers.get("content-disposition");
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1]?.replace(/['"]/g, "")
      : `file-${objectId}`;

    // Stream the file back to the client
    const blob = await response.blob();

    return new NextResponse(blob, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error downloading file:", error);
    return NextResponse.json(
      {
        error: "Failed to download file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
