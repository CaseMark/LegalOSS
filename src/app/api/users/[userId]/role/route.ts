import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/users/[userId]/role - Update user role (admin only)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requireAdmin();
    const { userId } = await params;
    const { role } = await request.json();

    if (!["admin", "user", "pending"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Prevent admin from demoting themselves
    if (userId === admin.id && role !== "admin") {
      return NextResponse.json({ error: "Cannot change your own admin role" }, { status: 400 });
    }

    await db.update(users).set({ role }).where(eq(users.id, userId));

    return NextResponse.json({ success: true, role });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Admin access required") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Users] Error updating role:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}
