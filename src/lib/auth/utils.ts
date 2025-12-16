/**
 * Auth utilities - Password hashing, user authentication
 * 
 * Note: For user creation, use the setup module directly.
 * This module focuses on authentication and user lookup.
 */
import bcrypt from "bcryptjs";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkHasUsers, isSetupComplete } from "./setup";

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check if any users exist (delegates to setup module)
 */
export async function hasUsers(): Promise<boolean> {
  return checkHasUsers();
}

/**
 * Check if signup is enabled
 */
export async function isSignupEnabled(): Promise<boolean> {
  // If setup not complete, signup is allowed for first admin
  if (!(await isSetupComplete())) {
    return true;
  }
  
  try {
    const db = await getDb();
    const { settings } = await import("@/db/schema");
    const setting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "ENABLE_SIGNUP"))
      .limit(1);

    if (!setting.length) {
      return false; // Default to disabled after setup
    }

    return setting[0].value === "true";
  } catch {
    return false;
  }
}

/**
 * Authenticate user by email/password
 */
export async function authenticateUser(
  email: string,
  password: string,
): Promise<{ id: string; email: string; name: string; role: string } | null> {
  try {
    const db = await getDb();
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user.length) {
      return null;
    }

    const isValid = await verifyPassword(password, user[0].passwordHash);
    if (!isValid) {
      return null;
    }

    // Update last active
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, user[0].id));

    return {
      id: user[0].id,
      email: user[0].email,
      name: user[0].name,
      role: user[0].role,
    };
  } catch (error) {
    console.error("[Auth] Authentication error:", error);
    return null;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id: string) {
  try {
    const db = await getDb();
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user[0] || null;
  } catch {
    return null;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  try {
    const db = await getDb();
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);
    return user[0] || null;
  } catch {
    return null;
  }
}

/**
 * Check if user is admin
 */
export function isAdmin(user: { role: string }): boolean {
  return user.role === "admin";
}

/**
 * Check if user can access resource
 */
export function canAccess(user: { role: string }, requiredRole: string): boolean {
  const roleHierarchy = { admin: 3, user: 2, pending: 1 };
  return (
    roleHierarchy[user.role as keyof typeof roleHierarchy] >= 
    roleHierarchy[requiredRole as keyof typeof roleHierarchy]
  );
}

// Note: For user creation, import from "./setup" directly or from "@/lib/auth"
