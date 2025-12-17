import { tool } from "ai";
import { z } from "zod";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * Direct Case.dev API Tools
 * These tools map 1:1 to Case.dev API endpoints
 * Showcases the full power of Case.dev through AI agents
 */

export const caseDevApiTools = {
  // ==================== VAULT MANAGEMENT ====================

  listVaults: tool({
    description:
      "List all vaults with their details. Use this to discover what vaults exist and get their IDs before performing operations. No parameters needed.",
    inputSchema: z.object({}),
    execute: async () => {
      console.log("[Tool] listVaults called");

      if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

      // Fetch directly from Case.dev API (endpoint is /vault singular)
      const response = await fetch(`${CASE_API_URL}/vault`, {
        headers: {
          Authorization: `Bearer ${CASE_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list vaults: ${response.statusText}`);
      }

      const data = await response.json();
      const allVaults = data.vaults || data;

      console.log("[Tool] Found vaults:", allVaults.length);

      return {
        totalVaults: allVaults.length,
        vaults: allVaults.map((v: any) => ({
          id: v.id,
          name: v.name,
          description: v.description,
          createdAt: v.createdAt || v.created_at,
        })),
      };
    },
  }),

  createVault: tool({
    description:
      "Create a new vault for storing documents. Can optionally enable GraphRAG for advanced entity extraction.",
    inputSchema: z.object({
      name: z.string().describe("Vault name (e.g., 'Smith v. Hospital Case 2024')"),
      description: z.string().optional().describe("Description of what this vault contains"),
      enableGraph: z.boolean().default(false).describe("Enable GraphRAG for entity/relationship extraction"),
    }),
    execute: async ({ name, description, enableGraph }) => {
      if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

      const response = await fetch(`${CASE_API_URL}/vault`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CASE_API_KEY}`,
        },
        body: JSON.stringify({ name, description, enableGraph }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create vault: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        vaultId: data.id,
        name: data.name,
        description: data.description,
        enableGraph: data.enableGraph,
        region: data.region,
        createdAt: data.createdAt,
      };
    },
  }),

  getVault: tool({
    description: "Get detailed information about a vault including configuration, storage stats, and GraphRAG status.",
    inputSchema: z.object({
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
        throw new Error(`Failed to get vault: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        enableGraph: data.enableGraph,
        totalObjects: data.totalObjects,
        totalBytes: data.totalBytes,
        totalVectors: data.totalVectors,
        region: data.region,
        chunkStrategy: data.chunkStrategy,
      };
    },
  }),

  // ==================== FILE OPERATIONS ====================

  listVaultObjects: tool({
    description:
      "List all files/objects in a vault with their processing status, chunk counts, and metadata. REQUIRED: You must provide a vaultId from the system prompt's vault list.",
    inputSchema: z.object({
      vaultId: z
        .string()
        .min(1)
        .describe(
          "The vault ID to list objects from. Example: 'jxs1nglycgrpl74bj8j0jnos'. Get this from the system prompt.",
        ),
    }),
    execute: async ({ vaultId }) => {
      console.log("[Tool] listVaultObjects called with vaultId:", vaultId);

      if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

      const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/objects`, {
        headers: {
          Authorization: `Bearer ${CASE_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list objects: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        vaultId,
        objects: (data.objects || []).map((obj: any) => ({
          id: obj.id,
          filename: obj.filename,
          ingestionStatus: obj.ingestionStatus,
          chunkCount: obj.chunkCount,
          vectorCount: obj.vectorCount,
          pageCount: obj.pageCount,
          textLength: obj.textLength,
          createdAt: obj.createdAt,
        })),
      };
    },
  }),

  triggerIngestion: tool({
    description:
      "Trigger OCR and indexing on an uploaded document. Makes it searchable. Can optionally enable GraphRAG processing.",
    inputSchema: z.object({
      vaultId: z.string().describe("The vault ID"),
      objectId: z.string().describe("The object/file ID to process"),
      enableGraphRAG: z.boolean().default(false).describe("Enable GraphRAG entity extraction"),
    }),
    execute: async ({ vaultId, objectId, enableGraphRAG }) => {
      if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

      const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/ingest/${objectId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CASE_API_KEY}`,
        },
        body: JSON.stringify({ enable_graphrag: enableGraphRAG }),
      });

      if (!response.ok) {
        throw new Error(`Failed to trigger ingestion: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        objectId,
        workflowId: data.workflowId,
        status: data.status,
        message: data.message,
      };
    },
  }),

  // ==================== SEARCH ====================

  searchVault: tool({
    description:
      "Search vault documents using semantic search. Supports fast (< 500ms) and hybrid (semantic + BM25 keyword) methods. REQUIRED: vaultId and query parameters.",
    inputSchema: z.object({
      vaultId: z
        .string()
        .min(1)
        .describe("The vault ID to search. Get from system prompt's vault list. Example: 'jxs1nglycgrpl74bj8j0jnos'"),
      query: z.string().min(1).describe("Search query in natural language. Example: 'post-operative care protocols'"),
      method: z
        .enum(["fast", "hybrid", "entity", "global", "local"])
        .default("hybrid")
        .describe("Search method: fast (pure semantic), hybrid (semantic+keyword), entity/global/local (GraphRAG)"),
      topK: z.number().default(5).describe("Number of results to return"),
    }),
    execute: async ({ vaultId, query, method, topK }) => {
      if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

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
        response: data.response,
        chunks: (data.chunks || []).map((chunk: any) => ({
          text: chunk.text,
          objectId: chunk.object_id,
          filename: chunk.filename,
          chunkIndex: chunk.chunk_index,
          score: chunk.hybridScore || chunk.distance || chunk.score,
        })),
        sources: data.sources,
      };
    },
  }),

  // ==================== OCR ====================

  submitOCR: tool({
    description: "Submit a document from a vault for OCR processing. Returns job ID for tracking.",
    inputSchema: z.object({
      vaultId: z.string().describe("Vault containing the document"),
      objectId: z.string().describe("Object/file ID to process"),
      engine: z.enum(["doctr", "google"]).default("doctr").describe("OCR engine"),
    }),
    execute: async ({ vaultId, objectId, engine }) => {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultId, objectId, engine, features: { embed: {} } }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit OCR job");
      }

      const data = await response.json();
      return {
        jobId: data.id,
        status: "submitted",
        message: "OCR job submitted successfully. Processing will take a few minutes.",
      };
    },
  }),

  // ==================== WORKFLOWS ====================

  searchWorkflows: tool({
    description:
      "Search and discover available Case.dev workflows. Use semantic search to find workflows by natural language description, or filter by category/type. Returns workflow IDs, names, descriptions, categories, and metadata.",
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe(
          "Natural language search query (e.g., 'process deposition documents', 'medical record analysis'). Uses semantic search if provided.",
        ),
      category: z
        .enum(["litigation", "regulatory", "transactional", "corporate"])
        .optional()
        .describe("Filter by parent category"),
      subCategory: z.string().optional().describe("Filter by sub-category"),
      type: z
        .enum(["document-processing", "case-intake", "compliance", "transactional"])
        .optional()
        .describe("Filter by workflow type"),
      limit: z.number().int().min(1).max(100).default(20).optional().describe("Max results to return (1-100)"),
    }),
    execute: async ({ query, category, subCategory, type, limit = 20 }) => {
      console.log("[Tool] searchWorkflows called:", { query, category, subCategory, type, limit });

      if (!CASE_API_KEY) {
        throw new Error("CASE_API_KEY not configured");
      }

      console.log("[Tool] searchWorkflows - API Key present:", !!CASE_API_KEY, "URL:", `${CASE_API_URL}/workflows/v1`);

      // Use semantic search if query provided, otherwise use GET with filters
      let response: Response;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${CASE_API_KEY}`,
      };

      if (query) {
        // POST /workflows/v1/search - Semantic search
        const body: any = {
          query,
          limit,
        };
        if (category) body.category = category;

        headers["Content-Type"] = "application/json";

        console.log("[Tool] searchWorkflows - POST request to:", `${CASE_API_URL}/workflows/v1/search`);
        response = await fetch(`${CASE_API_URL}/workflows/v1/search`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
      } else {
        // GET /workflows/v1 - List with filters
        const params = new URLSearchParams();
        if (category) params.append("category", category);
        if (subCategory) params.append("sub_category", subCategory);
        if (type) params.append("type", type);
        params.append("published", "true");
        params.append("limit", limit.toString());

        const url = `${CASE_API_URL}/workflows/v1?${params.toString()}`;
        console.log("[Tool] searchWorkflows - GET request to:", url);
        response = await fetch(url, {
          headers,
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Tool] searchWorkflows - Error response:", response.status, errorText);

        // Handle permission denied specifically
        if (response.status === 403) {
          let errorMessage = "API key does not have access to Workflows service";
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch {
            // Use default message if parsing fails
          }
          throw new Error(`${errorMessage}. Please ensure your API key has Workflows service access enabled.`);
        }

        throw new Error(`Failed to search workflows: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      return {
        query: query ?? "all",
        totalWorkflows: data.total ?? data.data?.length ?? 0,
        workflows: (data.data || []).map((w: any) => ({
          id: w.id,
          name: w.name,
          description: w.description,
          parentCategory: w.parent_category,
          subCategory: w.sub_category,
          type: w.type,
          stage: w.stage,
          version: w.version,
          similarityScore: w.similarity_score,
        })),
      };
    },
  }),

  getWorkflow: tool({
    description:
      "Get detailed metadata for a specific workflow by ID. Use this to see workflow details, demo videos, example outputs, and requirements before executing.",
    inputSchema: z.object({
      workflowId: z.string().describe("The workflow ID (UUID) to get details for"),
    }),
    execute: async ({ workflowId }) => {
      console.log("[Tool] getWorkflow called:", { workflowId });

      if (!CASE_API_KEY) {
        throw new Error("CASE_API_KEY not configured");
      }

      const url = `${CASE_API_URL}/workflows/v1/${workflowId}`;
      console.log("[Tool] getWorkflow - Request to:", url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${CASE_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Tool] getWorkflow - Error response:", response.status, errorText);

        // Handle permission denied specifically
        if (response.status === 403) {
          let errorMessage = "API key does not have access to Workflows service";
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch {
            // Use default message if parsing fails
          }
          throw new Error(`${errorMessage}. Please ensure your API key has Workflows service access enabled.`);
        }

        throw new Error(`Failed to get workflow: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        parentCategory: data.parent_category,
        subCategory: data.sub_category,
        type: data.type,
        stage: data.stage,
        version: data.version,
        demoVideoLink: data.demo_video_link,
        groundTruthExample: data.link_to_ground_truth_example,
        generatedExample: data.link_to_generated_example,
      };
    },
  }),

  // ==================== WEB SEARCH ====================

  webSearch: tool({
    description:
      "Search the web for information. Returns ranked results with titles, URLs, and snippets. Use this for finding current information, legal precedents, news, or research.",
    inputSchema: z.object({
      query: z.string().describe("Search query (e.g., 'HIPAA compliance requirements 2024')"),
      numResults: z.number().default(10).describe("Number of results to return (max 100)"),
      includeDomains: z
        .array(z.string())
        .optional()
        .describe("Only include results from these domains (e.g., ['law.cornell.edu', 'findlaw.com'])"),
      excludeDomains: z
        .array(z.string())
        .optional()
        .describe("Exclude results from these domains (e.g., ['reddit.com', 'twitter.com'])"),
      startPublishedDate: z.string().optional().describe("Only include results published after this date (ISO format)"),
    }),
    execute: async ({ query, numResults, includeDomains, excludeDomains, startPublishedDate }) => {
      console.log("[Tool] webSearch called:", { query, numResults });

      if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

      const response = await fetch(`${CASE_API_URL}/search/v1/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CASE_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          numResults: numResults || 10,
          type: "auto",
          includeDomains,
          excludeDomains,
          startPublishedDate,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Web search failed: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return {
        query,
        resultsFound: data.results?.length || 0,
        results: (data.results || []).map((r: any) => ({
          title: r.title,
          url: r.url,
          publishedDate: r.publishedDate,
          text: r.text?.substring(0, 500), // Truncate for token efficiency
        })),
      };
    },
  }),

  webAnswer: tool({
    description:
      "Get an AI-generated answer to a question using web search. Synthesizes information from multiple sources into a cohesive answer with citations. Best for questions that need current information.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Question to answer (e.g., 'What are the key changes in California employment law 2024?')"),
      numResults: z.number().default(10).describe("Number of web results to synthesize (more = better but slower)"),
    }),
    execute: async ({ query, numResults }) => {
      console.log("[Tool] webAnswer called:", { query });

      if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

      const response = await fetch(`${CASE_API_URL}/search/v1/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CASE_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          numResults: numResults || 10,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Web answer failed: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return {
        query,
        answer: data.answer || data.content,
        sources: data.sources || data.results?.map((r: any) => ({ title: r.title, url: r.url })),
      };
    },
  }),

  webResearch: tool({
    description:
      "Run deep, multi-step research on a complex topic. Takes longer (1-5 minutes) but produces comprehensive reports with multiple searches and source synthesis. Best for complex legal research questions.",
    inputSchema: z.object({
      instructions: z
        .string()
        .describe(
          "Research instructions (e.g., 'Research recent developments in non-compete agreement enforceability across US states')",
        ),
      model: z
        .enum(["exa-research-fast", "exa-research", "exa-research-pro"])
        .default("exa-research")
        .describe("Research depth: fast (~30s), standard (~2min), pro (~5min, most comprehensive)"),
    }),
    execute: async ({ instructions, model }) => {
      console.log("[Tool] webResearch called:", { instructions, model });

      if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

      // Start the research
      const startResponse = await fetch(`${CASE_API_URL}/search/v1/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CASE_API_KEY}`,
        },
        body: JSON.stringify({
          instructions,
          model: model || "exa-research",
        }),
      });

      if (!startResponse.ok) {
        const error = await startResponse.text();
        throw new Error(`Research failed to start: ${startResponse.status} - ${error}`);
      }

      const startData = await startResponse.json();
      const researchId = startData.researchId;

      // Poll for completion (max 5 minutes)
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(`${CASE_API_URL}/search/v1/research/${researchId}`, {
          headers: {
            Authorization: `Bearer ${CASE_API_KEY}`,
          },
        });

        if (!statusResponse.ok) continue;

        const statusData = await statusResponse.json();

        if (statusData.status === "completed") {
          return {
            researchId,
            status: "completed",
            report: statusData.output?.content,
            sources: statusData.sources,
            metadata: {
              pagesAnalyzed: statusData.costDollars?.numPages,
              searchesPerformed: statusData.costDollars?.numSearches,
            },
          };
        } else if (statusData.status === "failed" || statusData.status === "canceled") {
          throw new Error(`Research ${statusData.status}`);
        }
      }

      return {
        researchId,
        status: "timeout",
        message: "Research is still running. Check back later with the researchId.",
      };
    },
  }),

  // ==================== WORKFLOWS ====================

  executeWorkflow: tool({
    description:
      "Execute a Case.dev workflow on documents or text. First use searchWorkflows to find the workflow ID, then use this tool to execute it. Supports text input, document URLs, or vault object IDs.",
    inputSchema: z.object({
      workflowId: z
        .string()
        .describe("The workflow ID (UUID) to execute. Get this from searchWorkflows or getWorkflow."),
      text: z.string().optional().describe("Text content to process (e.g., deposition transcript text)"),
      documentUrl: z.string().url().optional().describe("URL to a document to process"),
      vaultObjectId: z.string().optional().describe("Vault object ID if document is in a vault"),
      model: z
        .string()
        .optional()
        .describe("LLM model to use (e.g., 'anthropic/claude-sonnet-4.5'). Defaults to workflow's recommended model."),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .default(0.7)
        .optional()
        .describe("Randomness/creativity (0-2, default: 0.7)"),
      maxTokens: z.number().int().min(1).default(4096).optional().describe("Maximum tokens to generate"),
      format: z.enum(["json", "text", "pdf"]).default("json").optional().describe("Output format"),
      variables: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          "Custom variables for prompt substitution (e.g., { case_name: 'Smith v. Hospital', date: '2024-01-15' })",
        ),
    }),
    execute: async ({
      workflowId,
      text,
      documentUrl,
      vaultObjectId,
      model,
      temperature,
      maxTokens,
      format,
      variables,
    }) => {
      console.log("[Tool] executeWorkflow called:", {
        workflowId,
        text: text ? `${text.substring(0, 50)}...` : undefined,
        documentUrl,
        vaultObjectId,
        model,
        temperature,
        maxTokens,
        format,
        variables,
      });

      if (!CASE_API_KEY) {
        throw new Error("CASE_API_KEY not configured");
      }

      // Validate that exactly one input method is provided
      const inputCount = [text, documentUrl, vaultObjectId].filter(Boolean).length;
      if (inputCount !== 1) {
        throw new Error("Exactly one of text, documentUrl, or vaultObjectId must be provided");
      }

      // Build request body
      const body: any = {
        input: {},
        options: {},
      };

      // Set input (exactly one)
      if (text) {
        body.input.text = text;
      } else if (documentUrl) {
        body.input.document_url = documentUrl;
      } else if (vaultObjectId) {
        body.input.vault_object_id = vaultObjectId;
      }

      // Set options
      if (model) body.options.model = model;
      if (temperature !== undefined) body.options.temperature = temperature;
      if (maxTokens !== undefined) body.options.max_tokens = maxTokens;
      if (format) body.options.format = format;

      // Set variables if provided
      if (variables && Object.keys(variables).length > 0) {
        body.variables = variables;
      }

      const url = `${CASE_API_URL}/workflows/v1/${workflowId}/execute`;
      console.log("[Tool] executeWorkflow - POST request to:", url, "API Key present:", !!CASE_API_KEY);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CASE_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Tool] executeWorkflow - Error response:", response.status, errorText);

        // Handle permission denied specifically
        if (response.status === 403) {
          let errorMessage = "API key does not have access to Workflows service";
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch {
            // Use default message if parsing fails
          }
          throw new Error(`${errorMessage}. Please ensure your API key has Workflows service access enabled.`);
        }

        throw new Error(`Failed to execute workflow: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      return {
        executionId: data.id,
        workflowId: data.workflow_id,
        workflowName: data.workflow_name,
        status: data.status,
        outputFormat: data.output?.format,
        outputData: data.output?.data,
        outputUrl: data.output?.url,
        outputExpiresAt: data.output?.expires_at,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
              cost: data.usage.cost,
            }
          : undefined,
        createdAt: data.created_at,
        durationMs: data.duration_ms,
      };
    },
  }),
};
