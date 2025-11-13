import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { desc } from "drizzle-orm";

/**
 * GET /api/users - List all users (admin only)
 */
export async function GET() {
  try {
    await requireAdmin();

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        profileImageUrl: users.profileImageUrl,
        lastActiveAt: users.lastActiveAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({ users: allUsers });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Admin access required") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Users] Error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
