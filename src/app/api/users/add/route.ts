import { NextRequest, NextResponse } from "next/server";

import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { getUserByEmail } from "@/lib/auth/utils";

const SALT_ROUNDS = 10;

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

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = uuidv4();

    // Create user directly (admin-initiated, bypasses first-user logic)
    const db = await getDb();
    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
      role,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: email.toLowerCase().trim(),
        name: name.trim(),
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
