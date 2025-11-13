import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cases, caseParties, caseEvents, caseTasks, caseDocuments, contacts } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { canAccessCase } from "@/lib/case-management/access";
import { eq } from "drizzle-orm";

/**
 * GET /api/cases/[caseId] - Get case details with related data
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const user = await requireAuth();
    const { caseId } = await params;

    // Get case
    const caseData = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);

    if (!caseData.length) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const caseItem = caseData[0];

    // Check access
    const hasAccess = await canAccessCase(user.id, user.role, caseItem);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get related data
    const [parties, events, tasks, documents] = await Promise.all([
      // Parties
      db.select().from(caseParties).where(eq(caseParties.caseId, caseId)),

      // Events
      db.select().from(caseEvents).where(eq(caseEvents.caseId, caseId)),

      // Tasks
      db.select().from(caseTasks).where(eq(caseTasks.caseId, caseId)),

      // Documents
      db.select().from(caseDocuments).where(eq(caseDocuments.caseId, caseId)),
    ]);

    return NextResponse.json({
      case: caseItem,
      parties,
      events,
      tasks,
      documents,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Cases] Get error:", error);
    return NextResponse.json({ error: "Failed to get case" }, { status: 500 });
  }
}
