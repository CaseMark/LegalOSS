import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * GET /api/vaults/[vaultId]/objects - List all objects in vault
 * Fetches directly from Case.dev API (source of truth)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ vaultId: string }> }) {
  try {
    await requirePermission("vaults.read");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { vaultId } = await params;

    // Fetch directly from Case.dev API
    const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/objects`, {
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      return NextResponse.json({ error: error.message || "Failed to list objects" }, { status: response.status });
    }

    const data = await response.json();

    // Transform Case.dev response to consistent format
    const objects = (data.objects || []).map((obj: any) => {
      // Determine status from ingestionStatus
      let status = obj.ingestionStatus || "pending";
      if (status === "pending" && obj.chunkCount > 0) {
        status = "completed";
      }

      return {
        id: obj.id,
        filename: obj.filename,
        contentType: obj.contentType,
        size: obj.sizeBytes || 0,
        status,
        pageCount: obj.pageCount,
        textLength: obj.textLength,
        chunkCount: obj.chunkCount,
        vectorCount: obj.vectorCount,
        createdAt: obj.createdAt,
        ingestionCompletedAt: obj.ingestionCompletedAt,
        metadata: obj.metadata,
      };
    });

    return NextResponse.json({ objects });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error listing objects:", error);
    return NextResponse.json({ error: "Failed to list objects" }, { status: 500 });
  }
}
