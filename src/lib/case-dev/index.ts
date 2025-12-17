/**
 * Case.dev Client for LegalOSS
 * Unified client for all Case.dev primitives
 */

const CASE_API_BASE = process.env.CASE_API_URL ?? "https://api.case.dev";

function getApiKey(): string {
  const key = process.env.CASE_API_KEY;
  if (!key) {
    throw new Error("CASE_API_KEY environment variable is not set");
  }
  return key;
}

async function caseRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${CASE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Case.dev API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// ============================================
// VAULT OPERATIONS
// ============================================

export interface VaultSearchResult {
  id: string;
  object_id: string;
  object_name: string;
  text: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export const vaults = {
  /**
   * Search within a vault (semantic search)
   */
  search: async (
    vaultId: string,
    options: {
      query: string;
      topK?: number;
      method?: "hybrid" | "fast" | "global" | "local";
      filters?: Record<string, unknown>;
    },
  ): Promise<VaultSearchResult[]> => {
    const response = await caseRequest<{ chunks?: VaultSearchResult[]; results?: VaultSearchResult[] }>(
      `/vault/${vaultId}/search`,
      {
        method: "POST",
        body: JSON.stringify(options),
      },
    );
    return response.chunks ?? response.results ?? [];
  },

  /**
   * List objects in a vault
   */
  listObjects: async (vaultId: string) => {
    const response = await caseRequest<{ vaultId: string; objects: unknown[]; count: number }>(
      `/vault/${vaultId}/objects`,
    );
    return response.objects;
  },

  /**
   * Get vault info
   */
  get: async (vaultId: string) => {
    return caseRequest(`/vault/${vaultId}`);
  },
};

// ============================================
// SEARCH OPERATIONS
// ============================================

export interface SearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  score: number;
  text?: string;
  highlights?: string[];
}

export const search = {
  /**
   * Web search
   */
  web: async (options: {
    query: string;
    numResults?: number;
    text?: boolean;
    highlights?: boolean;
  }): Promise<SearchResult[]> => {
    const response = await caseRequest<{ results: SearchResult[] }>("/search/v1/search", {
      method: "POST",
      body: JSON.stringify(options),
    });
    return response.results ?? [];
  },
};

// ============================================
// LLM OPERATIONS
// ============================================

export const llm = {
  /**
   * Create a chat completion
   */
  chat: async (options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
  }) => {
    return caseRequest("/llm/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify(options),
    });
  },
};

// ============================================
// FORMAT (DOCUMENT GENERATION) OPERATIONS
// ============================================

export const format = {
  /**
   * Generate a document from markdown content
   * Returns binary ArrayBuffer for PDF/DOCX
   */
  document: async (options: {
    content: string;
    input_format?: "md" | "json" | "text";
    output_format: "pdf" | "docx" | "html_preview";
    options?: Record<string, unknown>;
  }): Promise<ArrayBuffer> => {
    const response = await fetch(`${CASE_API_BASE}/format/v1/document`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: options.content,
        input_format: options.input_format ?? "md",
        output_format: options.output_format,
        options: options.options,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Format API error: ${response.status} - ${error}`);
    }

    return response.arrayBuffer();
  },
};

// ============================================
// UNIFIED CLIENT EXPORT
// ============================================

export const caseClient = {
  vaults,
  search,
  llm,
  format,
};

export default caseClient;
