import { NextResponse } from "next/server";
import { createUser, hasUsers, isSignupEnabled } from "@/lib/auth/utils";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
    }

    // Check if signup is enabled (unless first user)
    const hasAnyUsers = await hasUsers();
    if (hasAnyUsers) {
      const signupEnabled = await isSignupEnabled();
      if (!signupEnabled) {
        return NextResponse.json({ error: "Signup is disabled. Please contact an administrator." }, { status: 403 });
      }
    }

    // Create user
    const user = await createUser({ email, password, name });

    if (!user) {
      return NextResponse.json({ error: "Failed to create user. Email may already be in use." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      message:
        user.role === "admin"
          ? "Admin account created successfully! You can now log in."
          : "Account created successfully! You can now log in.",
    });
  } catch (error) {
    console.error("[Signup] Error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
