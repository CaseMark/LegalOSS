import { pgTable, text, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";

/**
 * Database schema for Legal AI Starter
 * Uses PostgreSQL via pglite (WASM) for maximum compatibility
 * Includes: Auth, RBAC, Case.dev resource tracking
 */

// ==================== AUTH & USERS ====================

export const users = pgTable("auth_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // admin, user, pending
  profileImageUrl: text("profile_image_url"),
  caseApiKey: text("case_api_key"), // User's personal Case.dev API key (optional)
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON string
});

export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  service: text("service"), // vaults, ocr, transcription, chat, speak
  action: text("action"), // create, read, update, delete, execute
  resourceType: text("resource_type"), // vault, ocr_job, transcription_job, etc
  resourceId: text("resource_id"),
  metadata: text("metadata"), // JSON
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Groups (custom teams like "Paralegals", "Partners", etc.)
export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(), // "Paralegals", "Partners", "Associates"
  description: text("description"),
  permissions: text("permissions").notNull(), // JSON - permission matrix
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User-Group membership (many-to-many)
export const userGroups = pgTable(
  "user_groups",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.groupId] })],
);

// ==================== CASE MANAGEMENT ====================

export const cases = pgTable("cases", {
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
  dateOpened: timestamp("date_opened"),
  trialDate: timestamp("trial_date"),
  dateClosed: timestamp("date_closed"),

  estimatedValue: integer("estimated_value"),
  customFields: text("custom_fields"), // JSON

  // Access control
  visibility: text("visibility").default("private"), // private, team, organization
  allowedGroupIds: text("allowed_group_ids"), // JSON array - groups that can view
  allowedUserIds: text("allowed_user_ids"), // JSON array - specific users

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contacts = pgTable("contacts", {
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const caseParties = pgTable(
  "case_parties",
  {
    caseId: text("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // plaintiff, defendant, plaintiff_attorney, etc.
    isPrimary: boolean("is_primary").default(false),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.caseId, table.contactId] })],
);

export const caseEvents = pgTable("case_events", {
  id: text("id").primaryKey(),
  caseId: text("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id), // Creator

  eventDate: timestamp("event_date").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type"), // incident, filing, deposition, hearing, etc.
  importance: text("importance").default("normal"), // critical, high, normal, low

  // Links to evidence
  vaultId: text("vault_id"),
  documentIds: text("document_ids"), // JSON array

  extractedBy: text("extracted_by").default("manual"), // manual, ai

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const caseTasks = pgTable("case_tasks", {
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
  dueDate: timestamp("due_date"),
  priority: text("priority").default("medium"), // low, medium, high, urgent
  status: text("status").default("pending"), // pending, in_progress, completed, cancelled
  taskType: text("task_type"), // research, draft, review, file, etc.

  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const caseDocuments = pgTable(
  "case_documents",
  {
    caseId: text("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    vaultId: text("vault_id").references(() => vaults.id),
    objectId: text("object_id"), // Vault object ID

    documentType: text("document_type"), // pleading, discovery, evidence, correspondence
    description: text("description"),
    filedDate: timestamp("filed_date"),
    linkedEventId: text("linked_event_id"), // Link to timeline event

    ocrJobId: text("ocr_job_id"), // If processed with OCR
    transcriptionJobId: text("transcription_job_id"), // If transcribed

    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.caseId, table.vaultId, table.objectId] })],
);

// ==================== CASE.DEV RESOURCES ====================

export const vaults = pgTable("vaults", {
  id: text("id").primaryKey(), // Case.dev vault ID
  userId: text("user_id")
    .references(() => users.id)
    .notNull(), // Creator
  name: text("name").notNull(),
  description: text("description"),
  region: text("region"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const vaultObjects = pgTable("vault_objects", {
  id: text("id").primaryKey(), // Case.dev object ID
  vaultId: text("vault_id")
    .notNull()
    .references(() => vaults.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  contentType: text("content_type"),
  size: integer("size"), // bytes
  status: text("status").default("pending"), // pending, processing, processed, error
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const ocrJobs = pgTable("ocr_jobs", {
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const transcriptionJobs = pgTable("transcription_jobs", {
  id: text("id").primaryKey(), // Case.dev transcription job ID
  userId: text("user_id")
    .references(() => users.id)
    .notNull(), // Creator
  filename: text("filename"),
  audioUrl: text("audio_url"),
  languageCode: text("language_code").default("en"),
  speakerLabels: boolean("speaker_labels").default(false),
  status: text("status").default("queued"), // queued, processing, completed, error
  audioDuration: integer("audio_duration"), // milliseconds
  confidence: integer("confidence"), // 0-100
  wordCount: integer("word_count"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
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

// ==================== CHAT & MESSAGES ====================

export const chats = pgTable("chats", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  caseId: text("case_id").references(() => cases.id, { onDelete: "set null" }),
  title: text("title").notNull().default("New Chat"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user', 'assistant'
  content: text("content").notNull(), // JSON string with parts
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==================== ARTIFACTS ====================

export const artifacts = pgTable("artifacts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  caseId: text("case_id").references(() => cases.id, { onDelete: "set null" }),
  chatId: text("chat_id").references(() => chats.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content"),
  kind: text("kind").notNull().default("text"), // text, memo, letter, brief, contract, summary
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ==================== TABULAR ANALYSIS ====================

export const tabularAnalyses = pgTable("tabular_analyses", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  caseId: text("case_id").references(() => cases.id, { onDelete: "set null" }),
  vaultId: text("vault_id").references(() => vaults.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  documentIds: text("document_ids").notNull(), // JSON array of vault object IDs
  columns: text("columns").notNull(), // JSON array of ExtractionColumn
  modelId: text("model_id").default("anthropic/claude-sonnet-4.5"),
  status: text("status").notNull().default("draft"), // draft, processing, completed, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tabularAnalysisRows = pgTable("tabular_analysis_rows", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id")
    .notNull()
    .references(() => tabularAnalyses.id, { onDelete: "cascade" }),
  documentId: text("document_id").notNull(), // Vault object ID
  data: text("data").notNull(), // JSON of cell values
  tokensUsed: integer("tokens_used").default(0),
  extractedAt: timestamp("extracted_at"),
});

// Types for new tables
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Artifact = typeof artifacts.$inferSelect;
export type NewArtifact = typeof artifacts.$inferInsert;
export type TabularAnalysis = typeof tabularAnalyses.$inferSelect;
export type NewTabularAnalysis = typeof tabularAnalyses.$inferInsert;
export type TabularAnalysisRow = typeof tabularAnalysisRows.$inferSelect;
export type NewTabularAnalysisRow = typeof tabularAnalysisRows.$inferInsert;

// Extraction column type for tabular analysis
export interface ExtractionColumn {
  id: string;
  name: string;
  prompt: string;
  dataType: "text" | "number" | "date" | "boolean";
  order: number;
  modelId?: string;
}

// Cell value type for tabular analysis
export interface CellValue {
  value: string | number | boolean | null;
  confidence?: number;
  sources?: string[];
  reasoning?: string;
  error?: string;
  tokensUsed?: number;
}
