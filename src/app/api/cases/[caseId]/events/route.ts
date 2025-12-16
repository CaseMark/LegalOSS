import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { cases, caseEvents } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { canAccessCase } from "@/lib/case-management/access";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/cases/[caseId]/events - Add event to timeline
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const user = await requireAuth();
    const { caseId } = await params;

    const db = await getDb();

    // Check access
    const caseData = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!caseData.length) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const hasAccess = await canAccessCase(user.id, user.role, caseData[0]);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { eventDate, title, description, eventType, importance } = await request.json();

    if (!eventDate || !title) {
      return NextResponse.json({ error: "Event date and title are required" }, { status: 400 });
    }

    const eventId = uuidv4();

    await db.insert(caseEvents).values({
      id: eventId,
      caseId,
      userId: user.id,
      eventDate: new Date(eventDate),
      title,
      description: description || null,
      eventType: eventType || null,
      importance: importance || "normal",
      vaultId: null,
      documentIds: null,
      extractedBy: "manual",
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, eventId }, { status: 201 });
  } catch (error: any) {
    console.error("[Events] Create error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
