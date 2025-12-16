/**
 * Group/Team Management - Open WebUI Pattern
 * Custom groups with permission matrices
 */
import { getDb } from "@/db";
import { groups, userGroups } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Permissions } from "./permissions";

/**
 * Get user's combined permissions from all groups
 * Most permissive wins (True > False)
 */
export async function getUserPermissions(userId: string): Promise<Permissions | null> {
  const db = await getDb();
  // Get all groups user is member of
  const userGroupMemberships = await db.select().from(userGroups).where(eq(userGroups.userId, userId));

  if (!userGroupMemberships.length) {
    return null; // User has no group memberships
  }

  const groupIds = userGroupMemberships.map((ug) => ug.groupId);

  if (!groupIds.length) {
    return null; // User has no group memberships
  }

  // Get all those groups using IN clause
  const userGroupsData = await db.select().from(groups).where(inArray(groups.id, groupIds));

  // Combine permissions (most permissive wins)
  let combined: any = {};

  for (const group of userGroupsData) {
    const groupPerms = JSON.parse(group.permissions);
    combined = combinePermissions(combined, groupPerms);
  }

  return combined;
}

/**
 * Combine two permission objects (most permissive wins)
 */
function combinePermissions(p1: any, p2: any): any {
  const result = { ...p1 };

  for (const [key, value] of Object.entries(p2)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Nested object - recurse
      result[key] = combinePermissions(result[key] || {}, value);
    } else {
      // Boolean - most permissive wins (true > false)
      result[key] = result[key] || value;
    }
  }

  return result;
}

/**
 * Create a new group
 */
export async function createGroup(data: {
  name: string;
  description?: string;
  permissions: Permissions;
}): Promise<string> {
  const db = await getDb();
  const groupId = uuidv4();

  await db.insert(groups).values({
    id: groupId,
    name: data.name,
    description: data.description || null,
    permissions: JSON.stringify(data.permissions),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return groupId;
}

/**
 * Add user to group
 */
export async function addUserToGroup(userId: string, groupId: string) {
  const db = await getDb();
  await db.insert(userGroups).values({
    userId,
    groupId,
    addedAt: new Date(),
  });
}

/**
 * Remove user from group
 */
export async function removeUserFromGroup(userId: string, groupId: string) {
  const db = await getDb();
  await db.delete(userGroups).where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)));
}

/**
 * Get all groups
 */
export async function getAllGroups() {
  const db = await getDb();
  return db.select().from(groups);
}

/**
 * Get groups a user belongs to
 */
export async function getUserGroups(userId: string) {
  const db = await getDb();
  const memberships = await db.select().from(userGroups).where(eq(userGroups.userId, userId));

  const groupIds = memberships.map((m) => m.groupId);

  if (!groupIds.length) return [];

  // Get group details using IN clause
  const userGroupsData = await db.select().from(groups).where(inArray(groups.id, groupIds));

  return userGroupsData;
}
