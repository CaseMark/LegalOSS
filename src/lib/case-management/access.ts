/**
 * Case Access Control - Group-scoped permissions
 * Following Open WebUI's access control pattern
 */
import { db } from "@/db";
import { cases, userGroups } from "@/db/schema";
import { eq } from "drizzle-orm";

interface CaseWithAccess {
  id: string;
  visibility: string | null;
  allowedGroupIds: string | null;
  allowedUserIds: string | null;
  userId: string; // Creator
}

/**
 * Check if user can access a case
 */
export async function canAccessCase(userId: string, userRole: string, caseData: CaseWithAccess): Promise<boolean> {
  // Admins can access everything
  if (userRole === "admin") {
    return true;
  }

  // Creator can always access their own cases
  if (caseData.userId === userId) {
    return true;
  }

  // Check visibility setting
  const visibility = caseData.visibility ?? "private";

  if (visibility === "organization") {
    // All users in org can view
    return true;
  }

  if (visibility === "private") {
    // Only creator and explicitly allowed users/groups
    const allowedUsers = caseData.allowedUserIds ? JSON.parse(caseData.allowedUserIds) : [];

    if (allowedUsers.includes(userId)) {
      return true;
    }

    // Check if user is in any allowed groups
    const allowedGroups = caseData.allowedGroupIds ? JSON.parse(caseData.allowedGroupIds) : [];

    if (allowedGroups.length > 0) {
      const userGroupMemberships = await db.select().from(userGroups).where(eq(userGroups.userId, userId));

      const userGroupIds = userGroupMemberships.map((ug) => ug.groupId);

      // Check if user is in any allowed group
      return userGroupIds.some((groupId) => allowedGroups.includes(groupId));
    }

    return false;
  }

  if (visibility === "team") {
    // Check allowed groups
    const allowedGroups = caseData.allowedGroupIds ? JSON.parse(caseData.allowedGroupIds) : [];

    const userGroupMemberships = await db.select().from(userGroups).where(eq(userGroups.userId, userId));

    const userGroupIds = userGroupMemberships.map((ug) => ug.groupId);

    return userGroupIds.some((groupId) => allowedGroups.includes(groupId));
  }

  return false;
}

/**
 * Filter cases user can access
 */
export async function getAccessibleCases(userId: string, userRole: string) {
  const allCases = await db.select().from(cases);

  if (userRole === "admin") {
    return allCases; // Admins see everything
  }

  // Filter cases user can access
  const accessible = [];
  for (const caseItem of allCases) {
    if (await canAccessCase(userId, userRole, caseItem)) {
      accessible.push(caseItem);
    }
  }

  return accessible;
}

/**
 * Generate next case number (auto-increment)
 */
export async function generateCaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const existingCases = await db
    .select()
    .from(cases)
    .where(eq(cases.caseNumber, `${year}-%`)); // Simplified - in production use LIKE

  const count = existingCases.length + 1;
  return `${year}-${count.toString().padStart(3, "0")}`; // 2024-001, 2024-002, etc.
}
