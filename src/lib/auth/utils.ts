/**
 * Auth utilities - Password hashing, user checks
 * Following Open WebUI pattern
 */
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import { users, settings } from "@/db/schema";
import { eq, count } from "drizzle-orm";

const SALT_ROUNDS = 10;

/**
 * Hash password using bcrypt (max 72 bytes)
 */
export async function hashPassword(password: string): Promise<string> {
  // Bcrypt has 72 byte limit
  const passwordBytes = Buffer.from(password, "utf-8");
  if (passwordBytes.length > 72) {
    throw new Error("Password too long (max 72 bytes)");
  }

  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check if any users exist (for first-user detection)
 */
export async function hasUsers(): Promise<boolean> {
  const result = await db.select({ count: count() }).from(users);
  return result[0].count > 0;
}

/**
 * Check if signup is enabled
 */
export async function isSignupEnabled(): Promise<boolean> {
  const setting = await db.select().from(settings).where(eq(settings.key, "ENABLE_SIGNUP")).limit(1);

  if (!setting.length) {
    // Default: enabled until first user created
    return !(await hasUsers());
  }

  return setting[0].value === "true";
}

/**
 * Disable signup (called after first user created)
 */
export async function disableSignup() {
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
}

/**
 * Get default role for new users
 */
export async function getDefaultRole(): Promise<string> {
  const setting = await db.select().from(settings).where(eq(settings.key, "DEFAULT_USER_ROLE")).limit(1);

  return setting[0]?.value || "user";
}

/**
 * Create new user (following Open WebUI pattern)
 */
export async function createUser(data: {
  email: string;
  password: string;
  name: string;
}): Promise<{ id: string; email: string; name: string; role: string } | null> {
  try {
    const userExists = await hasUsers();
    const role = userExists ? await getDefaultRole() : "admin";

    const passwordHash = await hashPassword(data.password);
    const userId = uuidv4();

    await db.insert(users).values({
      id: userId,
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash,
      role,
      createdAt: new Date(),
    });

    // Disable signup after first user
    if (!userExists) {
      await disableSignup();
      console.log("[Auth] First user created - signup disabled");
    }

    return {
      id: userId,
      email: data.email,
      name: data.name,
      role,
    };
  } catch (error) {
    console.error("[Auth] Failed to create user:", error);
    return null;
  }
}

/**
 * Authenticate user by email/password
 */
export async function authenticateUser(
  email: string,
  password: string,
): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

  if (!user.length) {
    return null;
  }

  const isValid = await verifyPassword(password, user[0].passwordHash);
  if (!isValid) {
    return null;
  }

  // Update last active
  await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, user[0].id));

  return {
    id: user[0].id,
    email: user[0].email,
    name: user[0].name,
    role: user[0].role,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(id: string) {
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user[0] || null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return user[0] || null;
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
    roleHierarchy[user.role as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole as keyof typeof roleHierarchy]
  );
}
