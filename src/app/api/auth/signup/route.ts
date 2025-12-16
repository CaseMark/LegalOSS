import { NextResponse } from "next/server";
import { createUser, hasUsers, isSignupEnabled } from "@/lib/auth/utils";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
    }

    // Check if this is the first user (always allowed)
    let isFirstUser = false;
    try {
      isFirstUser = !(await hasUsers());
    } catch (dbError) {
      // If we can't check for users, assume first user to allow initial setup
      console.warn("[Signup] Could not check hasUsers, assuming first user:", dbError);
      isFirstUser = true;
    }

    // For subsequent users, check if signup is enabled
    if (!isFirstUser) {
      try {
        const signupEnabled = await isSignupEnabled();
        if (!signupEnabled) {
          return NextResponse.json({ error: "Signup is disabled. Please contact an administrator." }, { status: 403 });
        }
      } catch (settingsError) {
        // If we can't check settings but know users exist, be cautious
        console.error("[Signup] Could not check signup settings:", settingsError);
        return NextResponse.json({ error: "Unable to verify signup status. Please try again." }, { status: 503 });
      }
    }

    // Create user
    const user = await createUser({ email, password, name });

    if (!user) {
      return NextResponse.json({ error: "Failed to create user. Email may already be in use." }, { status: 400 });
    }

    console.log(`[Signup] User created: ${user.email} (role: ${user.role}, isFirstUser: ${isFirstUser})`);

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
