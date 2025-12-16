import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { createGroup, getAllGroups } from "@/lib/auth/groups";

/**
 * GET /api/groups - List all groups
 */
export async function GET() {
  try {
    await requireAdmin();

    const allGroups = await getAllGroups();

    // Parse permissions JSON
    const groupsWithParsedPerms = allGroups.map((g) => ({
      ...g,
      permissions: JSON.parse(g.permissions),
    }));

    return NextResponse.json({ groups: groupsWithParsedPerms });
  } catch (error: any) {
    if (error.message?.includes("Admin")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

/**
 * POST /api/groups - Create new group
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const { name, description, permissions } = await request.json();

    if (!name || !permissions) {
      return NextResponse.json({ error: "Name and permissions are required" }, { status: 400 });
    }

    const groupId = await createGroup({ name, description, permissions });

    return NextResponse.json({ success: true, groupId }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("Admin")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "Group name already exists" }, { status: 400 });
    }
    console.error("[Groups] Create error:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
