/**
 * Development Seed Data
 * 
 * Automatically seeds the database with a dev admin user when:
 * - IS_DEV=true environment variable is set
 * - No users exist yet
 * 
 * This provides a zero-config development experience.
 */

import { getDb } from "@/db";
import { users, settings } from "@/db/schema";
import { count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// Dev credentials - hardcoded for convenience
export const DEV_ADMIN = {
  email: "admin-dev@case.dev",
  password: "password",
  name: "Dev Admin",
} as const;

const SALT_ROUNDS = 10;

let seedPromise: Promise<void> | null = null;
let seedComplete = false;

/**
 * Check if we're in dev mode
 */
export function isDevMode(): boolean {
  return process.env.IS_DEV === "true";
}

/**
 * Seed the database with dev data if in dev mode
 * Safe to call multiple times - will only seed once
 */
export async function seedDevData(): Promise<void> {
  // Skip if not in dev mode
  if (!isDevMode()) {
    return;
  }

  // Skip if already seeded
  if (seedComplete) {
    return;
  }

  // If seeding in progress, wait for it
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = doSeedDevData();
  await seedPromise;
}

async function doSeedDevData(): Promise<void> {
  try {
    console.log("[DevSeed] Checking if dev seed is needed...");
    
    const db = await getDb();
    
    // Check if users exist
    const userCount = await db.select({ count: count() }).from(users);
    
    if (userCount[0].count > 0) {
      console.log("[DevSeed] Users already exist, skipping seed");
      seedComplete = true;
      return;
    }

    console.log("[DevSeed] 🌱 Seeding dev admin user...");

    // Hash the dev password
    const passwordHash = await bcrypt.hash(DEV_ADMIN.password, SALT_ROUNDS);
    const userId = uuidv4();

    // Create dev admin
    await db.insert(users).values({
      id: userId,
      email: DEV_ADMIN.email,
      name: DEV_ADMIN.name,
      passwordHash,
      role: "admin",
      createdAt: new Date(),
    });

    // Set signup to disabled (admin exists)
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

    // Set default role for any future users
    await db
      .insert(settings)
      .values({
        key: "DEFAULT_USER_ROLE",
        value: "user",
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: "user" },
      });

    seedComplete = true;
    
    console.log("[DevSeed] ✅ Dev admin created:");
    console.log(`[DevSeed]    Email: ${DEV_ADMIN.email}`);
    console.log(`[DevSeed]    Password: ${DEV_ADMIN.password}`);
    console.log("[DevSeed] You can now log in with these credentials.");
  } catch (error) {
    console.error("[DevSeed] ❌ Failed to seed dev data:", error);
    // Don't throw - allow app to continue even if seeding fails
  } finally {
    seedPromise = null;
  }
}

/**
 * Get dev credentials for pre-filling forms (only in dev mode)
 */
export function getDevCredentials(): { email: string; password: string } | null {
  if (!isDevMode()) {
    return null;
  }
  return {
    email: DEV_ADMIN.email,
    password: DEV_ADMIN.password,
  };
}

