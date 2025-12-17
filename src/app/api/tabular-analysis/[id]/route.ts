import { NextResponse } from "next/server";

import { eq, and } from "drizzle-orm";

import { getDb } from "@/db";
import { tabularAnalyses, tabularAnalysisRows, cases } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { caseClient } from "@/lib/case-dev";

// Disable caching for this endpoint
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET - Get a specific analysis with its rows
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const { id } = await params;

    // Get the analysis
    const [analysis] = await db
      .select()
      .from(tabularAnalyses)
      .where(and(eq(tabularAnalyses.id, id), eq(tabularAnalyses.userId, user.id)))
      .limit(1);

    if (!analysis) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get all rows for this analysis
    const rows = await db.select().from(tabularAnalysisRows).where(eq(tabularAnalysisRows.analysisId, id));

    console.log("[API] GET analysis:", { id, status: analysis.status, rowCount: rows.length });

    // Get case info if linked
    let caseInfo: { id: string; name: string } | null = null;
    if (analysis.caseId) {
      const [caseResult] = await db
        .select({ id: cases.id, name: cases.title })
        .from(cases)
        .where(eq(cases.id, analysis.caseId))
        .limit(1);
      if (caseResult) {
        caseInfo = caseResult;
      }
    }

    // Get document titles from Case.dev vault
    let docTitles: Record<string, string> = {};
    if (analysis.vaultId) {
      try {
        const vaultObjects = await caseClient.vaults.listObjects(analysis.vaultId);
        docTitles = Object.fromEntries(vaultObjects.map((obj: any) => [obj.id, obj.filename]));
      } catch (e) {
        console.error("Failed to fetch vault objects:", e);
      }
    }

    return NextResponse.json({
      ...analysis,
      rows: rows.map((r) => ({
        ...r,
        documentTitle: docTitles[r.documentId] || "Unknown",
      })),
      matter: caseInfo,
    });
  } catch (error) {
    console.error("[tabular-analysis] Get failed:", error);
    return NextResponse.json({ error: "Failed to get analysis" }, { status: 500 });
  }
}

// PUT - Update analysis (columns, name, etc.)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const [existing] = await db
      .select()
      .from(tabularAnalyses)
      .where(and(eq(tabularAnalyses.id, id), eq(tabularAnalyses.userId, user.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update allowed fields
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.columns) updates.columns = body.columns;
    if (body.modelId) updates.modelId = body.modelId;
    if (body.status) updates.status = body.status;

    const [updated] = await db.update(tabularAnalyses).set(updates).where(eq(tabularAnalyses.id, id)).returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[tabular-analysis] Update failed:", error);
    return NextResponse.json({ error: "Failed to update analysis" }, { status: 500 });
  }
}

// DELETE - Delete an analysis and its rows
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const { id } = await params;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(tabularAnalyses)
      .where(and(eq(tabularAnalyses.id, id), eq(tabularAnalyses.userId, user.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete rows first (cascade should handle this, but be explicit)
    await db.delete(tabularAnalysisRows).where(eq(tabularAnalysisRows.analysisId, id));

    // Delete the analysis
    await db.delete(tabularAnalyses).where(eq(tabularAnalyses.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[tabular-analysis] Delete failed:", error);
    return NextResponse.json({ error: "Failed to delete analysis" }, { status: 500 });
  }
}
