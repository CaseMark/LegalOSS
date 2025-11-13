import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import fs from "fs";

// Create data directory if it doesn't exist
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "legal-ai.db");
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });

// Initialize database with schema
export function initDb() {
  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      profile_image_url TEXT,
      case_api_key TEXT,
      last_active_at INTEGER,
      created_at INTEGER NOT NULL
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
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_groups (
      user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      added_at INTEGER NOT NULL,
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
      date_opened INTEGER,
      trial_date INTEGER,
      date_closed INTEGER,
      estimated_value INTEGER,
      custom_fields TEXT,
      visibility TEXT DEFAULT 'private',
      allowed_group_ids TEXT,
      allowed_user_ids TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
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
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS case_parties (
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (case_id, contact_id)
    );

    CREATE TABLE IF NOT EXISTS case_events (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES auth_users(id),
      event_date INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT,
      importance TEXT DEFAULT 'normal',
      vault_id TEXT,
      document_ids TEXT,
      extracted_by TEXT DEFAULT 'manual',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS case_tasks (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      assigned_to TEXT REFERENCES auth_users(id),
      created_by TEXT NOT NULL REFERENCES auth_users(id),
      title TEXT NOT NULL,
      description TEXT,
      due_date INTEGER,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      task_type TEXT,
      completed_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS case_documents (
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      vault_id TEXT REFERENCES vaults(id),
      object_id TEXT,
      document_type TEXT,
      description TEXT,
      filed_date INTEGER,
      linked_event_id TEXT,
      ocr_job_id TEXT,
      transcription_job_id TEXT,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (case_id, vault_id, object_id)
    );

    CREATE TABLE IF NOT EXISTS vaults (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth_users(id),
      name TEXT NOT NULL,
      description TEXT,
      region TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vault_objects (
      id TEXT PRIMARY KEY,
      vault_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      content_type TEXT,
      size INTEGER,
      status TEXT DEFAULT 'pending',
      uploaded_at INTEGER NOT NULL,
      FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE
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
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS transcription_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth_users(id),
      filename TEXT,
      audio_url TEXT,
      language_code TEXT DEFAULT 'en',
      speaker_labels INTEGER DEFAULT 0,
      status TEXT DEFAULT 'queued',
      audio_duration INTEGER,
      confidence INTEGER,
      word_count INTEGER,
      error TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );
  `);
}

// Auto-initialize on import
initDb();
