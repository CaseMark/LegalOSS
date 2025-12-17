/**
 * Session helpers for API routes
 *
 * DEV MODE: When IS_DEV=true, returns a mock admin user (no auth required)
 */
import { auth } from "@/lib/auth";

import { getUserById } from "./utils";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

// Mock dev user - used when IS_DEV=true
const DEV_USER: SessionUser = {
  id: "dev-admin-id",
  email: "admin-dev@case.dev",
  name: "Dev Admin",
  role: "admin",
};

/**
 * Get current user from session (for API routes)
 * Returns null if not authenticated
 * In DEV mode: Always returns mock admin user
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  // DEV MODE: Return mock admin user
  if (process.env.IS_DEV === "true") {
    return DEV_USER;
  }

  // PRODUCTION: Normal session check
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const userId = (session.user as any).id;
  if (!userId) {
    return null;
  }

  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/**
 * Require authenticated user (throws if not logged in)
 * In DEV mode: Always returns mock admin user
 */
export async function requireAuth(): Promise<SessionUser> {
  // DEV MODE: Return mock admin user
  if (process.env.IS_DEV === "true") {
    return DEV_USER;
  }

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * Require admin role
 * In DEV mode: Always returns mock admin user
 */
export async function requireAdmin(): Promise<SessionUser> {
  // DEV MODE: Return mock admin user
  if (process.env.IS_DEV === "true") {
    return DEV_USER;
  }

  const user = await requireAuth();

  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

/**
 * Check if user has a specific permission
 * Combines role-based permissions with group-based permissions
 * Most permissive wins (true > false)
 */
export async function checkPermission(userId: string, userRole: string, permissionKey: string): Promise<boolean> {
  const { getPermissions, hasPermission } = await import("./permissions");
  const { getUserPermissions } = await import("./groups");

  // Get role-based permissions
  const roleHasPermission = hasPermission(userRole, permissionKey);

  // Get group-based permissions
  const groupPermissions = await getUserPermissions(userId);

  if (!groupPermissions) {
    // No group memberships, use role-based only
    return roleHasPermission;
  }

  // Check permission in group permissions
  const keys = permissionKey.split(".");
  let current: any = groupPermissions;
  for (const key of keys) {
    if (current[key] === undefined) {
      // Group permissions don't have this key, use role-based
      return roleHasPermission;
    }
    current = current[key];
  }

  const groupHasPermission = Boolean(current);

  // Most permissive wins (true > false)
  return roleHasPermission || groupHasPermission;
}

/**
 * Require a specific permission (throws if user doesn't have it)
 */
export async function requirePermission(permissionKey: string): Promise<SessionUser> {
  const user = await requireAuth();

  const hasAccess = await checkPermission(user.id, user.role, permissionKey);

  if (!hasAccess) {
    throw new Error(`Permission denied: ${permissionKey}`);
  }

  return user;
}
