import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { addUserToGroup, removeUserFromGroup } from "@/lib/auth/groups";

/**
 * POST /api/groups/[groupId]/members - Add user to group
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    await requireAdmin();
    const { groupId } = await params;
    const { userId } = await request.json();

    await addUserToGroup(userId, groupId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes("Admin")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to add user to group" }, { status: 500 });
  }
}

/**
 * DELETE /api/groups/[groupId]/members/[userId] - Remove user from group
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    await requireAdmin();
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    await removeUserFromGroup(userId, groupId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes("Admin")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to remove user from group" }, { status: 500 });
  }
}
