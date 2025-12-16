import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { cases, caseTasks } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { canAccessCase } from "@/lib/case-management/access";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/cases/[caseId]/tasks - Create task
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

    const { title, description, dueDate, priority, assignedTo } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const taskId = uuidv4();

    await db.insert(caseTasks).values({
      id: taskId,
      caseId,
      createdBy: user.id,
      assignedTo: assignedTo || user.id,
      title,
      description: description || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || "medium",
      status: "pending",
      taskType: null,
      completedAt: null,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, taskId }, { status: 201 });
  } catch (error: any) {
    console.error("[Tasks] Create error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

/**
 * PATCH /api/cases/[caseId]/tasks/[taskId] - Update task status
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const user = await requireAuth();
    const { caseId } = await params;
    const { taskId, status } = await request.json();

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

    const updateData: any = { status };
    if (status === "completed") {
      updateData.completedAt = new Date();
    }

    await db.update(caseTasks).set(updateData).where(eq(caseTasks.id, taskId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Tasks] Update error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
