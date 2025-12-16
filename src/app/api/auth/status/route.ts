import { NextResponse } from "next/server";
import { hasUsers, isSignupEnabled } from "@/lib/auth/utils";

/**
 * GET /api/auth/status
 * Check auth status (for registration page)
 * 
 * On fresh deploys, this endpoint determines whether signup should be allowed.
 * If DB checks fail, we default to allowing first-user signup to ensure
 * the admin can always be created.
 */
export async function GET() {
  try {
    const anyUsers = await hasUsers();
    
    // For first user, always allow signup regardless of settings
    if (!anyUsers) {
      return NextResponse.json({
        hasUsers: false,
        signupEnabled: true,
        isFirstUser: true,
      });
    }
    
    // For subsequent users, check the signup setting
    const signupAllowed = await isSignupEnabled();

    return NextResponse.json({
      hasUsers: true,
      signupEnabled: signupAllowed,
      isFirstUser: false,
    });
  } catch (error) {
    console.error("[Auth Status] Error:", error);
    // On error, return first-user defaults to allow admin setup on fresh deploys
    // The signup API will do its own validation
    return NextResponse.json({
      hasUsers: false,
      signupEnabled: true,
      isFirstUser: true,
      _error: "Status check had issues, defaulting to first-user mode",
    });
  }
}
