import { NextResponse } from "next/server";
import { getSetupStatus } from "@/lib/auth/setup";

/**
 * GET /api/auth/status
 * Check auth status (for registration page)
 * 
 * Returns the current system setup state:
 * - isFirstUser: true if no admin exists yet
 * - signupEnabled: true if regular signup is allowed
 * - setupInProgress: true if first-admin creation is happening
 * - dbReady: true if database is accessible
 */
export async function GET() {
  try {
    const status = await getSetupStatus();
    
    return NextResponse.json({
      hasUsers: !status.isFirstUser,
      signupEnabled: status.signupEnabled,
      isFirstUser: status.isFirstUser,
      setupInProgress: status.setupInProgress,
      dbReady: status.dbReady,
    });
  } catch (error) {
    console.error("[Auth Status] Unexpected error:", error);
    
    // Default to first-user mode to allow initial setup
    return NextResponse.json({
      hasUsers: false,
      signupEnabled: true,
      isFirstUser: true,
      setupInProgress: false,
      dbReady: false,
      _error: "Status check failed, defaulting to first-user mode",
    });
  }
}
