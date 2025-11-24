import { z } from "zod";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

type ToolDefinition = {
  description: string;
  parameters: z.ZodTypeAny;
  execute: (...args: any[]) => Promise<any>;
};

const createTool = (definition: ToolDefinition) => definition;

/**
 * Case.dev Tool Definitions for AI SDK
 * These tools allow AI agents to interact with Case.dev services
 */

export const searchVaultsTool = createTool({
  description: `Search across vault documents using semantic search. Use this when the user asks to find information in their documents, search for specific content, or retrieve relevant passages. Only works on vaults that have indexed documents. Supports fast (< 500ms) and hybrid (semantic + keyword) search methods.`,
  parameters: z.object({
    query: z.string().describe("The search query in natural language"),
    vaultId: z
      .string()
      .describe(
        "The vault ID to search (required). Available vaults: pe68vz9cjla500i2c7on9o6f, oyqnfqacv14co207z9o2bq5f",
      ),
    method: z
      .enum(["fast", "hybrid"])
      .default("hybrid")
      .describe("Search method: 'fast' for pure semantic, 'hybrid' for semantic + keyword matching"),
    topK: z.number().default(5).describe("Number of results to return"),
  }),
  execute: async ({ query, vaultId, method, topK }) => {
    if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

    if (!vaultId) {
      return {
        error: "vaultId is required. Please specify which vault to search.",
      };
    }

    const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify({ query, method, topK }),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      method: data.method,
      query: data.query,
      resultsFound: data.chunks?.length || 0,
      chunks: data.chunks?.map((chunk: any) => ({
        text: chunk.text,
        filename: chunk.filename || "Unknown",
        chunkIndex: chunk.chunk_index,
        score: chunk.hybridScore || chunk.distance || chunk.score,
      })),
      sources: data.sources,
    };
  },
});

export const listVaultsTool = createTool({
  description: `List all available vaults. Use this to discover which vaults exist before searching them.`,
  parameters: z.object({}),
  execute: async () => {
    if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

    // Note: This would need a Case.dev endpoint to list all vaults
    // For now, return a message
    return {
      message: "Vault listing requires integration with your local database. Please specify a vault ID directly.",
    };
  },
});

export const runWorkflowTool = createTool({
  description: `Execute a Case.dev legal workflow on a document. Available workflows include deposition summaries, medical chronologies, trial summaries, and more. Use this when the user wants to analyze or summarize a legal document.`,
  parameters: z.object({
    workflowType: z
      .enum([
        "MEDICAL_CHRONOLOGY",
        "MEDICAL_NARRATIVE",
        "DEPOSITION_SUMMARY_PAGELINE_V3",
        "DEPOSITION_SUMMARY_NARRATIVE_V2",
        "DEPOSITION_ANALYSIS",
        "TRIAL_SUMMARY_V2",
        "MEDICAL_RECORD_ANALYSIS",
      ])
      .describe("Type of legal workflow to run"),
    documentUrl: z.string().url().describe("URL to the document to process"),
    vaultId: z.string().optional().describe("Vault ID if document is in a vault"),
    objectId: z.string().optional().describe("Object ID if document is in a vault"),
  }),
  execute: async ({ workflowType, documentUrl, vaultId, objectId }) => {
    if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

    // This would call the Case.dev workflow API
    // For now, return a placeholder
    return {
      workflowType,
      status: "submitted",
      message: `Workflow ${workflowType} submitted for processing. This would normally return a job ID to track progress.`,
      documentUrl,
    };
  },
});

export const triggerOCRTool = createTool({
  description: `Extract text from a document using OCR. Use this when the user wants to process a PDF or image document for text extraction.`,
  parameters: z.object({
    vaultId: z.string().describe("Vault ID containing the document"),
    objectId: z.string().describe("Object ID of the document to process"),
    engine: z.enum(["doctr", "google"]).default("doctr").describe("OCR engine to use"),
  }),
  execute: async ({ vaultId, objectId, engine }) => {
    if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

    const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/ingest/${objectId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify({ enable_graphrag: false }),
    });

    if (!response.ok) {
      throw new Error(`OCR failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      objectId,
      workflowId: data.workflowId,
      status: data.status,
      message: data.message || "OCR processing started",
    };
  },
});

export const getVaultInfoTool = createTool({
  description: `Get information about a specific vault including statistics and configuration.`,
  parameters: z.object({
    vaultId: z.string().describe("The vault ID to get information about"),
  }),
  execute: async ({ vaultId }) => {
    if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

    const response = await fetch(`${CASE_API_URL}/vault/${vaultId}`, {
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get vault info: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      totalObjects: data.totalObjects,
      totalVectors: data.totalVectors,
      totalBytes: data.totalBytes,
      enableGraph: data.enableGraph,
      region: data.region,
    };
  },
});

// Export all tools
export const caseDevTools = {
  searchVaults: searchVaultsTool,
  getVaultInfo: getVaultInfoTool,
  triggerOCR: triggerOCRTool,
  runWorkflow: runWorkflowTool,
};

// Export vault filesystem tools separately (dynamic based on selected vaults)
export { vaultFilesystemTools } from "./tools/vault-filesystem";
