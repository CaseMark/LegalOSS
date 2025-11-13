/**
 * Case.dev API Client
 *
 * Utility functions for interacting with Case.dev services
 * Documentation: https://docs.case.dev
 */

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

interface CaseAPIOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Base fetch wrapper for Case.dev API
 */
async function caseAPI<T>(endpoint: string, options: CaseAPIOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const response = await fetch(`${CASE_API_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CASE_API_KEY}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * Vault API Methods
 */
export const vaults = {
  /**
   * Create a new vault
   * POST /vault
   */
  create: async (data: { name: string; description?: string }) => {
    return caseAPI("/vault", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Get vault details
   * GET /vault/:id
   */
  get: async (vaultId: string) => {
    return caseAPI(`/vault/${vaultId}`);
  },

  /**
   * List all objects in a vault
   * GET /vault/:id/objects
   */
  listObjects: async (vaultId: string) => {
    return caseAPI(`/vault/${vaultId}/objects`);
  },

  /**
   * Get presigned upload URL
   * POST /vault/:id/upload
   */
  getUploadUrl: async (vaultId: string, data: { filename: string; contentType: string }) => {
    return caseAPI(`/vault/${vaultId}/upload`, {
      method: "POST",
      body: data,
    });
  },

  /**
   * Download a file from vault
   * GET /vault/:id/objects/:objectId/download
   */
  download: async (vaultId: string, objectId: string) => {
    const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/objects/${objectId}/download`, {
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    return response.blob();
  },

  /**
   * Trigger OCR processing on a document
   * POST /vault/:id/ingest/:objectId
   */
  ingest: async (vaultId: string, objectId: string) => {
    return caseAPI(`/vault/${vaultId}/ingest/${objectId}`, {
      method: "POST",
    });
  },

  /**
   * Search documents in vault
   * POST /vault/:id/search
   */
  search: async (vaultId: string, query: string, topK: number = 10) => {
    return caseAPI(`/vault/${vaultId}/search`, {
      method: "POST",
      body: { query, topK },
    });
  },
};

/**
 * OCR API Methods
 */
export const ocr = {
  /**
   * Process document with OCR
   * POST /ocr/v1
   */
  process: async (data: { documentUrl: string; engine?: "google" | "tesseract" }) => {
    return caseAPI("/ocr/v1", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Get OCR job status
   * GET /ocr/v1/:jobId
   */
  getStatus: async (jobId: string) => {
    return caseAPI(`/ocr/v1/${jobId}`);
  },
};

/**
 * Transcription API Methods
 */
export const transcription = {
  /**
   * Transcribe audio file
   * POST /voice/transcribe
   */
  transcribe: async (data: { audioUrl: string; speakerLabels?: boolean; languageCode?: string }) => {
    return caseAPI("/voice/transcribe", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Get transcription status
   * GET /voice/transcribe/:jobId
   */
  getStatus: async (jobId: string) => {
    return caseAPI(`/voice/transcribe/${jobId}`);
  },
};

/**
 * Helper to upload file to presigned URL
 */
export async function uploadToPresignedUrl(url: string, file: File, contentType: string) {
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return true;
}
