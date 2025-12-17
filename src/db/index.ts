import fs from "fs";
import path from "path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "./schema";

/**
 * PGlite database setup
 * Uses embedded PostgreSQL via WASM for maximum compatibility
 * No native dependencies - works in any Node.js environment
 */

// Check if running on Vercel (serverless) - use in-memory mode
const isVercel = process.env.VERCEL === "1";

// Data directory for persistence (only for local development)
let dataDir: string | undefined;

if (!isVercel) {
  dataDir = path.join(process.cwd(), "data", "pgdata");
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Cached database instance
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let pgliteInstance: PGlite | null = null;
let initPromise: Promise<ReturnType<typeof drizzle<typeof schema>>> | null = null;

/**
 * Get the database instance (async, cached)
 * Call this in API routes and server functions
 */
export async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = initializeDb();
  return initPromise;
}

/**
 * Initialize the database
 */
async function initializeDb() {
  if (isVercel) {
    console.log("[DB] Initializing PGlite database (in-memory mode for Vercel)...");
  } else {
    console.log("[DB] Initializing PGlite database...");
  }

  // Create PGlite instance - in-memory for Vercel, persistent for local
  // Pass undefined or empty string for in-memory mode
  pgliteInstance = new PGlite(dataDir ?? "memory://");

  // Wait for it to be ready
  await pgliteInstance.waitReady;

  // Create Drizzle instance
  dbInstance = drizzle(pgliteInstance, { schema });

  // Initialize tables
  await initTables();

  console.log("[DB] PGlite database ready");

  // Seed dev data if in dev mode (async, don't block)
  if (process.env.IS_DEV === "true") {
    import("@/lib/auth/dev-seed").then(({ seedDevData }) => {
      seedDevData().catch((err) => {
        console.error("[DB] Dev seed failed:", err);
      });
    });
  }

  return dbInstance;
}

/**
 * Initialize database tables
 */
async function initTables() {
  if (!pgliteInstance) return;

  // Create tables if they don't exist
  await pgliteInstance.exec(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      profile_image_url TEXT,
      case_api_key TEXT,
      last_active_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES auth_users(id),
      service TEXT,
      action TEXT,
      resource_type TEXT,
      resource_id TEXT,
      metadata TEXT,
      ip_address TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_groups (
      user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      added_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, group_id)
    );

    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth_users(id),
      case_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      case_type TEXT,
      status TEXT DEFAULT 'active',
      jurisdiction TEXT,
      court_name TEXT,
      official_case_number TEXT,
      date_opened TIMESTAMP,
      trial_date TIMESTAMP,
      date_closed TIMESTAMP,
      estimated_value INTEGER,
      custom_fields TEXT,
      visibility TEXT DEFAULT 'private',
      allowed_group_ids TEXT,
      allowed_user_ids TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES auth_users(id),
      type TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      entity_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      bar_number TEXT,
      specialization TEXT,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS case_parties (
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      is_primary BOOLEAN DEFAULT FALSE,
      added_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (case_id, contact_id)
    );

    CREATE TABLE IF NOT EXISTS case_events (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES auth_users(id),
      event_date TIMESTAMP NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT,
      importance TEXT DEFAULT 'normal',
      vault_id TEXT,
      document_ids TEXT,
      extracted_by TEXT DEFAULT 'manual',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS case_tasks (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      assigned_to TEXT REFERENCES auth_users(id),
      created_by TEXT NOT NULL REFERENCES auth_users(id),
      title TEXT NOT NULL,
      description TEXT,
      due_date TIMESTAMP,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      task_type TEXT,
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vaults (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth_users(id),
      name TEXT NOT NULL,
      description TEXT,
      region TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS case_documents (
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      vault_id TEXT REFERENCES vaults(id),
      object_id TEXT,
      document_type TEXT,
      description TEXT,
      filed_date TIMESTAMP,
      linked_event_id TEXT,
      ocr_job_id TEXT,
      transcription_job_id TEXT,
      added_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (case_id, vault_id, object_id)
    );

    CREATE TABLE IF NOT EXISTS vault_objects (
      id TEXT PRIMARY KEY,
      vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      content_type TEXT,
      size INTEGER,
      status TEXT DEFAULT 'pending',
      uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ocr_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth_users(id),
      document_id TEXT,
      vault_id TEXT,
      object_id TEXT,
      filename TEXT NOT NULL,
      document_url TEXT,
      engine TEXT DEFAULT 'doctr',
      status TEXT DEFAULT 'pending',
      page_count INTEGER DEFAULT 0,
      chunk_count INTEGER DEFAULT 0,
      chunks_completed INTEGER DEFAULT 0,
      chunks_processing INTEGER DEFAULT 0,
      chunks_failed INTEGER DEFAULT 0,
      confidence INTEGER,
      text_length INTEGER,
      error TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transcription_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth_users(id),
      filename TEXT,
      audio_url TEXT,
      language_code TEXT DEFAULT 'en',
      speaker_labels BOOLEAN DEFAULT FALSE,
      status TEXT DEFAULT 'queued',
      audio_duration INTEGER,
      confidence INTEGER,
      word_count INTEGER,
      error TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'text',
      content TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tabular_analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
      vault_id TEXT REFERENCES vaults(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      document_ids TEXT NOT NULL DEFAULT '[]',
      columns TEXT NOT NULL DEFAULT '[]',
      model_id TEXT DEFAULT 'anthropic/claude-sonnet-4.5',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tabular_analysis_rows (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL REFERENCES tabular_analyses(id) ON DELETE CASCADE,
      document_id TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * For backwards compatibility - synchronous db export
 * WARNING: This will throw if called before async init completes
 * Prefer using getDb() in new code
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    if (!dbInstance) {
      throw new Error("Database not initialized. Use `await getDb()` instead of `db` for async initialization.");
    }
    return (dbInstance as any)[prop];
  },
});

// Export for migrations or direct access if needed
export { schema };
