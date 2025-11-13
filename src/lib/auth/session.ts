/**
 * Session helpers for API routes
 */
import { auth } from "@/lib/auth";
import { getUserById } from "./utils";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

/**
 * Get current user from session (for API routes)
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
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
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<SessionUser> {
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
