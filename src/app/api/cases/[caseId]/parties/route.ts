import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cases, caseParties } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { canAccessCase } from "@/lib/case-management/access";
import { eq } from "drizzle-orm";

/**
 * POST /api/cases/[caseId]/parties - Add party to case
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const user = await requireAuth();
    const { caseId } = await params;

    // Check access
    const caseData = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!caseData.length) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const hasAccess = await canAccessCase(user.id, user.role, caseData[0]);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { contactId, role, isPrimary } = await request.json();

    if (!contactId || !role) {
      return NextResponse.json({ error: "Contact ID and role are required" }, { status: 400 });
    }

    await db.insert(caseParties).values({
      caseId,
      contactId,
      role,
      isPrimary: isPrimary || false,
      addedAt: new Date(),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("[Parties] Add error:", error);
    return NextResponse.json({ error: "Failed to add party" }, { status: 500 });
  }
}
