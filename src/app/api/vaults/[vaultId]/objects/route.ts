import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vaultObjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * GET /api/vaults/[vaultId]/objects - List all objects in vault
 * Returns data from local DB merged with Case.dev API
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ vaultId: string }> }) {
  try {
    await requirePermission("vaults.read");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { vaultId } = await params;

    // Get from Case.dev API (source of truth)
    const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/objects`, {
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`Case.dev objects API failed: ${response.status} - ${errorText}`);

      // Fallback to local DB only
      const localObjects = await db.select().from(vaultObjects).where(eq(vaultObjects.vaultId, vaultId));

      console.log(`Falling back to local DB: ${localObjects.length} objects`);

      return NextResponse.json({
        objects: localObjects.map((obj) => ({
          id: obj.id,
          filename: obj.filename,
          contentType: obj.contentType,
          size: obj.size || 0,
          status: obj.status || "unknown",
          createdAt: obj.uploadedAt,
        })),
        source: "local_db_fallback",
      });
    }

    const data = await response.json();
    console.log(`Case.dev returned ${data.objects?.length || 0} objects`);

    // Get local DB data for size/status enrichment
    const localObjects = await db.select().from(vaultObjects).where(eq(vaultObjects.vaultId, vaultId));

    const localMap = new Map(localObjects.map((obj) => [obj.id, obj]));

    // Transform and merge: prefer Case.dev API for status (source of truth)
    const objects = (data.objects || []).map((obj: any) => {
      const localObj = localMap.get(obj.id);

      // Determine status: Case.dev ingestionStatus is source of truth
      // If no ingestionStatus, file is uploaded but not yet indexed
      let status = obj.ingestionStatus;
      if (!status || status === "pending") {
        // File exists in S3 but hasn't been ingested yet
        status = obj.chunkCount > 0 ? "completed" : "pending";
      }

      return {
        id: obj.id,
        filename: obj.filename,
        contentType: obj.contentType,
        // Use local size if available and non-zero, otherwise Case.dev size
        size: localObj?.size && localObj.size > 0 ? localObj.size : obj.sizeBytes || 0,
        status: status,
        pageCount: obj.pageCount,
        textLength: obj.textLength,
        chunkCount: obj.chunkCount,
        vectorCount: obj.vectorCount,
        createdAt: obj.createdAt,
        ingestionCompletedAt: obj.ingestionCompletedAt,
        metadata: obj.metadata,
        ingestionStatus: obj.ingestionStatus, // Keep original for debugging
      };
    });

    console.log(
      `Merged objects with local DB data:`,
      objects.map((o: typeof objects[number]) => ({
        id: o.id,
        filename: o.filename,
        size: o.size,
        status: o.status,
        ingestionStatus: o.ingestionStatus,
        chunkCount: o.chunkCount,
        vectorCount: o.vectorCount,
      })),
    );

    return NextResponse.json({ objects, source: "case_api_with_local_enrichment" });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error listing objects:", error);
    return NextResponse.json({ error: "Failed to list objects" }, { status: 500 });
  }
}
