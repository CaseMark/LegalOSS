import { Search, Database, FileText, Zap, FolderLock, FolderPlus, GitBranch } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ToolOption {
  name: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "caseDevApi" | "legacy";
  requiresVaultSelection?: boolean;
  status?: "active" | "coming_soon";
  defaultEnabled?: boolean;
}

export const caseDevApiToolOptions: ToolOption[] = [
  {
    name: "listVaults",
    label: "List Vaults",
    description: "Discover every vault plus id/name/description metadata.",
    icon: FolderLock,
    group: "caseDevApi",
    defaultEnabled: true,
  },
  {
    name: "createVault",
    label: "Create Vault",
    description: "Provision a brand new vault from the agent.",
    icon: FolderPlus,
    group: "caseDevApi",
    defaultEnabled: true,
  },
  {
    name: "getVault",
    label: "Get Vault Details",
    description: "Inspect configuration, storage, and GraphRAG status.",
    icon: Database,
    group: "caseDevApi",
    defaultEnabled: true,
    requiresVaultSelection: true,
  },
  {
    name: "listVaultObjects",
    label: "List Vault Objects",
    description: "Enumerate uploaded files and their ingestion status.",
    icon: FileText,
    group: "caseDevApi",
    defaultEnabled: true,
    requiresVaultSelection: true,
  },
  {
    name: "searchVault",
    label: "Search Vault",
    description: "Semantic/hybrid search across vault content.",
    icon: Search,
    group: "caseDevApi",
    defaultEnabled: true,
    requiresVaultSelection: true,
  },
  {
    name: "triggerIngestion",
    label: "Trigger Ingestion",
    description: "Kick off OCR + indexing for a specific object.",
    icon: Zap,
    group: "caseDevApi",
    defaultEnabled: true,
    requiresVaultSelection: true,
  },
  {
    name: "submitOCR",
    label: "Submit OCR Job",
    description: "Send objects through OCR pipelines programmatically.",
    icon: FileText,
    group: "caseDevApi",
    defaultEnabled: true,
    requiresVaultSelection: true,
  },
  {
    name: "searchWorkflows",
    label: "Search Workflows",
    description: "List available legal AI workflows to run.",
    icon: GitBranch,
    group: "caseDevApi",
    defaultEnabled: true,
  },
  {
    name: "getWorkflow",
    label: "Get Workflow Details",
    description: "Fetch configuration for a workflow id.",
    icon: GitBranch,
    group: "caseDevApi",
    defaultEnabled: true,
  },
  {
    name: "executeWorkflow",
    label: "Execute Workflow",
    description: "Kick off workflow execution on a document.",
    icon: Zap,
    group: "caseDevApi",
    defaultEnabled: true,
  },
];

export const legacyToolOptions: ToolOption[] = [
  {
    name: "searchVaults",
    label: "Legacy Vault Search",
    description: "Older semantic search demo pipeline.",
    icon: Search,
    group: "legacy",
    status: "active",
    requiresVaultSelection: true,
  },
  {
    name: "getVaultInfo",
    label: "Legacy Vault Info",
    description: "Deprecated vault stats endpoint.",
    icon: Database,
    group: "legacy",
    status: "active",
    requiresVaultSelection: true,
  },
  {
    name: "triggerOCR",
    label: "Legacy OCR",
    description: "Older OCR API path (use Case.dev API instead).",
    icon: FileText,
    group: "legacy",
    status: "active",
    requiresVaultSelection: true,
  },
  {
    name: "runWorkflow",
    label: "Legacy Workflows",
    description: "Example workflow runner (coming soon).",
    icon: Zap,
    group: "legacy",
    status: "coming_soon",
  },
];

// Flattened helpers
export const allToolOptions = [...caseDevApiToolOptions, ...legacyToolOptions];

export const defaultEnabledToolState = allToolOptions.reduce<Record<string, boolean>>((acc, tool) => {
  acc[tool.name] = tool.defaultEnabled ?? false;
  return acc;
}, {});
