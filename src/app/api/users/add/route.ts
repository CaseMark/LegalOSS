import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { createUser, getUserByEmail } from "@/lib/auth/utils";

/**
 * POST /api/users/add - Create new user (admin only)
 * Admin can create users with specific roles
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const { email, password, name, role = "user" } = await request.json();

    // Validate
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
    }

    if (!["admin", "user", "pending"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if email exists
    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    // Note: We bypass the "first user = admin" logic here
    // Admin is explicitly setting the role
    const { hashPassword } = await import("@/lib/auth/utils");
    const { v4: uuidv4 } = await import("uuid");
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();

    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase(),
      name,
      passwordHash,
      role,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        name,
        role,
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Admin access required") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[Users] Error adding user:", error);
    return NextResponse.json({ error: "Failed to add user" }, { status: 500 });
  }
}
