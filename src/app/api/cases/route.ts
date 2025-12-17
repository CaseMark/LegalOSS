import { NextRequest, NextResponse } from "next/server";

import { v4 as uuidv4 } from "uuid";

import { getDb } from "@/db";
import { cases } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { getAccessibleCases, generateCaseNumber } from "@/lib/case-management/access";

/**
 * GET /api/cases - List cases user can access (group-scoped)
 */
export async function GET() {
  try {
    const user = await requireAuth();

    // Get only cases user can access based on groups
    const accessible = await getAccessibleCases(user.id, user.role);

    return NextResponse.json({ cases: accessible });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Cases] List error:", error);
    return NextResponse.json({ error: "Failed to list cases" }, { status: 500 });
  }
}

/**
 * POST /api/cases - Create new case
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const {
      title,
      description,
      caseType,
      jurisdiction,
      courtName,
      officialCaseNumber,
      dateOpened,
      trialDate,
      estimatedValue,
      visibility = "private",
      allowedGroupIds = [],
      allowedUserIds = [],
    } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const caseId = uuidv4();
    const caseNumber = await generateCaseNumber();

    const db = await getDb();
    await db.insert(cases).values({
      id: caseId,
      userId: user.id,
      caseNumber,
      title,
      description: description || null,
      caseType: caseType || null,
      status: "active",
      jurisdiction: jurisdiction || null,
      courtName: courtName || null,
      officialCaseNumber: officialCaseNumber || null,
      dateOpened: dateOpened ? new Date(dateOpened) : new Date(),
      trialDate: trialDate ? new Date(trialDate) : null,
      dateClosed: null,
      estimatedValue: estimatedValue || null,
      customFields: null,
      visibility,
      allowedGroupIds: JSON.stringify(allowedGroupIds),
      allowedUserIds: JSON.stringify(allowedUserIds),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        caseId,
        caseNumber,
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Cases] Create error:", error);
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }
}
