import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Database schema for Legal AI Starter
 * Includes: Auth, RBAC, Case.dev resource tracking
 */

// ==================== AUTH & USERS ====================

export const users = sqliteTable("auth_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // admin, user, pending
  profileImageUrl: text("profile_image_url"),
  caseApiKey: text("case_api_key"), // User's personal Case.dev API key (optional)
  lastActiveAt: integer("last_active_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON string
});

export const activityLog = sqliteTable("activity_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  service: text("service"), // vaults, ocr, transcription, chat, speak
  action: text("action"), // create, read, update, delete, execute
  resourceType: text("resource_type"), // vault, ocr_job, transcription_job, etc
  resourceId: text("resource_id"),
  metadata: text("metadata"), // JSON
  ipAddress: text("ip_address"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Groups (custom teams like "Paralegals", "Partners", etc.)
export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(), // "Paralegals", "Partners", "Associates"
  description: text("description"),
  permissions: text("permissions").notNull(), // JSON - permission matrix
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// User-Group membership (many-to-many)
export const userGroups = sqliteTable("user_groups", {
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  addedAt: integer("added_at", { mode: "timestamp" }).notNull(),
});

// ==================== CASE MANAGEMENT ====================

export const cases = sqliteTable("cases", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id), // Creator
  caseNumber: text("case_number").notNull().unique(), // Auto: 2024-001
  title: text("title").notNull(),
  description: text("description"),
  caseType: text("case_type"), // Personal Injury, Contract, Criminal, etc.
  status: text("status").default("active"), // intake, active, settlement, trial, closed, archived
  jurisdiction: text("jurisdiction"),
  courtName: text("court_name"),
  officialCaseNumber: text("official_case_number"), // Court's case number

  // Important dates
  dateOpened: integer("date_opened", { mode: "timestamp" }),
  trialDate: integer("trial_date", { mode: "timestamp" }),
  dateClosed: integer("date_closed", { mode: "timestamp" }),

  estimatedValue: integer("estimated_value"),
  customFields: text("custom_fields"), // JSON

  // Access control
  visibility: text("visibility").default("private"), // private, team, organization
  allowedGroupIds: text("allowed_group_ids"), // JSON array - groups that can view
  allowedUserIds: text("allowed_user_ids"), // JSON array - specific users

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id), // Creator
  type: text("type").notNull(), // client, opposing_party, attorney, witness, expert, judge

  firstName: text("first_name"),
  lastName: text("last_name"),
  entityName: text("entity_name"), // For organizations

  email: text("email"),
  phone: text("phone"),
  address: text("address"),

  barNumber: text("bar_number"), // For attorneys
  specialization: text("specialization"), // For experts

  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const caseParties = sqliteTable("case_parties", {
  caseId: text("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // plaintiff, defendant, plaintiff_attorney, etc.
  isPrimary: integer("is_primary", { mode: "boolean" }).default(false),
  addedAt: integer("added_at", { mode: "timestamp" }).notNull(),
});

export const caseEvents = sqliteTable("case_events", {
  id: text("id").primaryKey(),
  caseId: text("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id), // Creator

  eventDate: integer("event_date", { mode: "timestamp" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type"), // incident, filing, deposition, hearing, etc.
  importance: text("importance").default("normal"), // critical, high, normal, low

  // Links to evidence
  vaultId: text("vault_id"),
  documentIds: text("document_ids"), // JSON array

  extractedBy: text("extracted_by").default("manual"), // manual, ai

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const caseTasks = sqliteTable("case_tasks", {
  id: text("id").primaryKey(),
  caseId: text("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  assignedTo: text("assigned_to").references(() => users.id),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),

  title: text("title").notNull(),
  description: text("description"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  priority: text("priority").default("medium"), // low, medium, high, urgent
  status: text("status").default("pending"), // pending, in_progress, completed, cancelled
  taskType: text("task_type"), // research, draft, review, file, etc.

  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const caseDocuments = sqliteTable("case_documents", {
  caseId: text("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  vaultId: text("vault_id").references(() => vaults.id),
  objectId: text("object_id"), // Vault object ID

  documentType: text("document_type"), // pleading, discovery, evidence, correspondence
  description: text("description"),
  filedDate: integer("filed_date", { mode: "timestamp" }),
  linkedEventId: text("linked_event_id"), // Link to timeline event

  ocrJobId: text("ocr_job_id"), // If processed with OCR
  transcriptionJobId: text("transcription_job_id"), // If transcribed

  addedAt: integer("added_at", { mode: "timestamp" }).notNull(),
});

// ==================== CASE.DEV RESOURCES ====================

export const vaults = sqliteTable("vaults", {
  id: text("id").primaryKey(), // Case.dev vault ID
  userId: text("user_id")
    .references(() => users.id)
    .notNull(), // Creator
  name: text("name").notNull(),
  description: text("description"),
  region: text("region"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const vaultObjects = sqliteTable("vault_objects", {
  id: text("id").primaryKey(), // Case.dev object ID
  vaultId: text("vault_id")
    .notNull()
    .references(() => vaults.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  contentType: text("content_type"),
  size: integer("size"), // bytes
  status: text("status").default("pending"), // pending, processing, processed, error
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).notNull(),
});

export const ocrJobs = sqliteTable("ocr_jobs", {
  id: text("id").primaryKey(), // Case.dev OCR job ID
  userId: text("user_id")
    .references(() => users.id)
    .notNull(), // Creator
  documentId: text("document_id"),
  vaultId: text("vault_id"), // If triggered from vault
  objectId: text("object_id"), // If triggered from vault
  filename: text("filename").notNull(),
  documentUrl: text("document_url"),
  engine: text("engine").default("doctr"),
  status: text("status").default("pending"), // pending, processing, completed, failed, canceled
  pageCount: integer("page_count").default(0),
  chunkCount: integer("chunk_count").default(0),
  chunksCompleted: integer("chunks_completed").default(0),
  chunksProcessing: integer("chunks_processing").default(0),
  chunksFailed: integer("chunks_failed").default(0),
  confidence: integer("confidence"), // 0-100
  textLength: integer("text_length"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const transcriptionJobs = sqliteTable("transcription_jobs", {
  id: text("id").primaryKey(), // Case.dev transcription job ID
  userId: text("user_id")
    .references(() => users.id)
    .notNull(), // Creator
  filename: text("filename"),
  audioUrl: text("audio_url"),
  languageCode: text("language_code").default("en"),
  speakerLabels: integer("speaker_labels", { mode: "boolean" }).default(false),
  status: text("status").default("queued"), // queued, processing, completed, error
  audioDuration: integer("audio_duration"), // milliseconds
  confidence: integer("confidence"), // 0-100
  wordCount: integer("word_count"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type NewActivityLogEntry = typeof activityLog.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type UserGroup = typeof userGroups.$inferSelect;

export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type CaseParty = typeof caseParties.$inferSelect;
export type CaseEvent = typeof caseEvents.$inferSelect;
export type NewCaseEvent = typeof caseEvents.$inferInsert;
export type CaseTask = typeof caseTasks.$inferSelect;
export type NewCaseTask = typeof caseTasks.$inferInsert;
export type CaseDocument = typeof caseDocuments.$inferSelect;

export type Vault = typeof vaults.$inferSelect;
export type NewVault = typeof vaults.$inferInsert;
export type VaultObject = typeof vaultObjects.$inferSelect;
export type NewVaultObject = typeof vaultObjects.$inferInsert;
export type OCRJob = typeof ocrJobs.$inferSelect;
export type NewOCRJob = typeof ocrJobs.$inferInsert;
export type TranscriptionJob = typeof transcriptionJobs.$inferSelect;
export type NewTranscriptionJob = typeof transcriptionJobs.$inferInsert;
