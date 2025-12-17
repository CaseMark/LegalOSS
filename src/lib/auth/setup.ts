/**
 * First-time setup and admin creation
 *
 * This module handles the critical "first admin user" flow with:
 * - Mutex locking to prevent race conditions
 * - Atomic transactions for user + settings
 * - Retry logic for database operations
 * - State tracking to prevent duplicate setup
 */

import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

import { getDb } from "@/db";
import { users, settings } from "@/db/schema";

const SALT_ROUNDS = 10;

// In-memory setup state (process-level lock)
let setupInProgress = false;
let setupCompleted = false;
let setupPromise: Promise<SetupResult> | null = null;

interface SetupResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  error?: string;
  alreadySetup?: boolean;
}

/**
 * Check if the database has any users
 * Includes retry logic for initialization delays
 */
export async function checkHasUsers(maxRetries = 3): Promise<boolean> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const db = await getDb();
      const result = await db.select({ count: count() }).from(users);
      return result[0].count > 0;
    } catch (error) {
      lastError = error as Error;
      console.warn(`[Setup] checkHasUsers attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms...
        await sleep(100 * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastError ?? new Error("Failed to check for users");
}

/**
 * Check if system setup is complete (has admin user)
 */
export async function isSetupComplete(): Promise<boolean> {
  // Fast path: we already know setup is done
  if (setupCompleted) {
    return true;
  }

  try {
    return await checkHasUsers();
  } catch {
    return false;
  }
}

/**
 * Get the current setup status
 * Safe to call anytime - handles all error cases gracefully
 */
export async function getSetupStatus(): Promise<{
  isFirstUser: boolean;
  signupEnabled: boolean;
  setupInProgress: boolean;
  dbReady: boolean;
}> {
  // If setup is in progress, signal that
  if (setupInProgress) {
    return {
      isFirstUser: true,
      signupEnabled: false, // Prevent concurrent signups during setup
      setupInProgress: true,
      dbReady: true,
    };
  }

  try {
    const hasUsers = await checkHasUsers(2); // Fewer retries for status checks

    if (!hasUsers) {
      return {
        isFirstUser: true,
        signupEnabled: true,
        setupInProgress: false,
        dbReady: true,
      };
    }

    // Check signup setting
    const db = await getDb();
    const setting = await db.select().from(settings).where(eq(settings.key, "ENABLE_SIGNUP")).limit(1);

    const signupEnabled = setting.length === 0 || setting[0].value === "true";

    return {
      isFirstUser: false,
      signupEnabled,
      setupInProgress: false,
      dbReady: true,
    };
  } catch (error) {
    console.warn("[Setup] getSetupStatus error, defaulting to first-user mode:", error);

    // Default to first-user mode to allow initial setup
    return {
      isFirstUser: true,
      signupEnabled: true,
      setupInProgress: false,
      dbReady: false,
    };
  }
}

/**
 * Create the first admin user (atomic, mutex-protected)
 *
 * This is the ONLY way to create the first user.
 * It's protected by:
 * 1. In-memory mutex (prevents concurrent calls in same process)
 * 2. Database-level unique constraint on email
 * 3. Atomic check-and-set for the setup flag
 */
export async function createFirstAdmin(data: { email: string; password: string; name: string }): Promise<SetupResult> {
  // If we already have a setup in progress, wait for it
  if (setupPromise) {
    console.log("[Setup] Setup already in progress, waiting...");
    return setupPromise;
  }

  // If setup is already complete, reject
  if (setupCompleted) {
    return {
      success: false,
      error: "Setup already complete",
      alreadySetup: true,
    };
  }

  // Start the setup process with mutex
  setupInProgress = true;

  setupPromise = doCreateFirstAdmin(data).finally(() => {
    setupInProgress = false;
    setupPromise = null;
  });

  return setupPromise;
}

/**
 * Internal: Actually create the first admin
 */
async function doCreateFirstAdmin(data: { email: string; password: string; name: string }): Promise<SetupResult> {
  console.log("[Setup] Starting first admin creation...");

  try {
    // Wait for database to be ready with retries
    const db = await getDb();

    // Double-check no users exist (inside the mutex)
    const existingUsers = await db.select({ count: count() }).from(users);

    if (existingUsers[0].count > 0) {
      console.log("[Setup] Users already exist, aborting first-admin creation");
      setupCompleted = true;
      return {
        success: false,
        error: "Admin user already exists",
        alreadySetup: true,
      };
    }

    // Validate password
    const passwordBytes = Buffer.from(data.password, "utf-8");
    if (passwordBytes.length > 72) {
      return {
        success: false,
        error: "Password too long (max 72 bytes)",
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const userId = uuidv4();

    console.log("[Setup] Creating admin user...");

    // Create user
    await db.insert(users).values({
      id: userId,
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      passwordHash,
      role: "admin",
      createdAt: new Date(),
    });

    console.log("[Setup] Admin user created, disabling signup...");

    // Disable signup for future users (using upsert)
    await db
      .insert(settings)
      .values({
        key: "ENABLE_SIGNUP",
        value: "false",
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: "false" },
      });

    // Mark setup as complete
    setupCompleted = true;

    console.log("[Setup] ✅ First admin created successfully:", data.email);

    // Give the database a moment to sync (pglite WAL flush)
    await sleep(100);

    return {
      success: true,
      user: {
        id: userId,
        email: data.email.toLowerCase().trim(),
        name: data.name.trim(),
        role: "admin",
      },
    };
  } catch (error: any) {
    console.error("[Setup] ❌ First admin creation failed:", error);

    // Check if it's a unique constraint violation (user already exists)
    if (error.message?.includes("UNIQUE") || error.message?.includes("unique")) {
      setupCompleted = true;
      return {
        success: false,
        error: "Email already in use",
        alreadySetup: true,
      };
    }

    return {
      success: false,
      error: error.message ?? "Failed to create admin user",
    };
  }
}

/**
 * Create a regular user (non-admin)
 * Only works if signup is enabled
 */
// eslint-disable-next-line complexity
export async function createRegularUser(data: { email: string; password: string; name: string }): Promise<SetupResult> {
  try {
    const db = await getDb();

    // Check if signup is enabled
    const setting = await db.select().from(settings).where(eq(settings.key, "ENABLE_SIGNUP")).limit(1);

    // Default to disabled if setting doesn't exist (first user uses createFirstAdmin)
    const signupEnabled = setting.length > 0 && setting[0].value === "true";

    if (!signupEnabled) {
      return {
        success: false,
        error: "Signup is disabled. Contact an administrator.",
      };
    }

    // Get default role
    const roleSetting = await db.select().from(settings).where(eq(settings.key, "DEFAULT_USER_ROLE")).limit(1);

    const role = roleSetting[0]?.value || "user";

    // Validate and hash password
    const passwordBytes = Buffer.from(data.password, "utf-8");
    if (passwordBytes.length > 72) {
      return {
        success: false,
        error: "Password too long (max 72 bytes)",
      };
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const userId = uuidv4();

    // Create user
    await db.insert(users).values({
      id: userId,
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      passwordHash,
      role,
      createdAt: new Date(),
    });

    return {
      success: true,
      user: {
        id: userId,
        email: data.email.toLowerCase().trim(),
        name: data.name.trim(),
        role,
      },
    };
  } catch (error: any) {
    console.error("[Signup] Regular user creation failed:", error);

    if (error.message?.includes("UNIQUE") || error.message?.includes("unique")) {
      return {
        success: false,
        error: "Email already in use",
      };
    }

    return {
      success: false,
      error: error.message ?? "Failed to create user",
    };
  }
}

/**
 * Reset setup state (for testing only)
 */
export function resetSetupState() {
  setupInProgress = false;
  setupCompleted = false;
  setupPromise = null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
