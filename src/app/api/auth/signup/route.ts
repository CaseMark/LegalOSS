import { NextResponse } from "next/server";
import { 
  getSetupStatus, 
  createFirstAdmin, 
  createRegularUser 
} from "@/lib/auth/setup";

/**
 * POST /api/auth/signup
 * 
 * Handles both first-admin creation and regular user signup.
 * 
 * For first admin:
 * - Uses mutex-protected atomic creation
 * - Automatically disables future signups
 * - Handles race conditions gracefully
 * 
 * For regular users:
 * - Checks if signup is enabled
 * - Uses default role from settings
 */
export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" }, 
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    
    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Get current setup status
    const status = await getSetupStatus();
    
    // If setup is in progress, tell client to wait and retry
    if (status.setupInProgress) {
      return NextResponse.json(
        { 
          error: "Setup in progress. Please wait a moment and try again.",
          retryAfter: 2,
        }, 
        { status: 503 }
      );
    }
    
    let result;
    
    if (status.isFirstUser) {
      // First user flow - creates admin
      console.log("[Signup] Creating first admin user:", email);
      result = await createFirstAdmin({ email, password, name });
    } else if (status.signupEnabled) {
      // Regular user flow
      console.log("[Signup] Creating regular user:", email);
      result = await createRegularUser({ email, password, name });
    } else {
      // Signup disabled
      return NextResponse.json(
        { error: "Signup is disabled. Please contact an administrator." }, 
        { status: 403 }
      );
    }
    
    // Handle result
    if (!result.success) {
      // Already setup is not really an error - someone else created admin first
      if (result.alreadySetup) {
        return NextResponse.json(
          { 
            error: "An admin user already exists. Please log in instead.",
            redirectTo: "/auth/v1/login",
          }, 
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: result.error || "Failed to create account" }, 
        { status: 400 }
      );
    }
    
    console.log(`[Signup] ✅ User created: ${result.user!.email} (role: ${result.user!.role})`);

    return NextResponse.json({
      success: true,
      user: result.user,
      message: result.user!.role === "admin"
        ? "Admin account created successfully! You can now log in."
        : "Account created successfully! You can now log in.",
    });
  } catch (error) {
    console.error("[Signup] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." }, 
      { status: 500 }
    );
  }
}
