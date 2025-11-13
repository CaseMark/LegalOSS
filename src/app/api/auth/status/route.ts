import { NextResponse } from "next/server";
import { hasUsers, isSignupEnabled } from "@/lib/auth/utils";

/**
 * GET /api/auth/status
 * Check auth status (for registration page)
 */
export async function GET() {
  try {
    const anyUsers = await hasUsers();
    const signupAllowed = await isSignupEnabled();

    return NextResponse.json({
      hasUsers: anyUsers,
      signupEnabled: signupAllowed,
      isFirstUser: !anyUsers,
    });
  } catch (error) {
    console.error("[Auth Status] Error:", error);
    return NextResponse.json({ error: "Failed to check auth status" }, { status: 500 });
  }
}
