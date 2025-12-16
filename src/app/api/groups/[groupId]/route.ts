import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { groups } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/groups/[groupId] - Update group permissions
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    await requireAdmin();
    const { groupId } = await params;
    const { permissions } = await request.json();

    if (!permissions) {
      return NextResponse.json({ error: "Permissions are required" }, { status: 400 });
    }

    const db = await getDb();
    await db
      .update(groups)
      .set({
        permissions: JSON.stringify(permissions),
        updatedAt: new Date(),
      })
      .where(eq(groups.id, groupId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes("Admin")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Groups] Update error:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}
