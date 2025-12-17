import "server-only";
import { tool } from "ai";
import { z } from "zod";

const CASE_API_BASE = process.env.CASE_API_URL || "https://api.case.dev";

function getApiKey(): string {
  const key = process.env.CASE_API_KEY;
  if (!key) {
    throw new Error("CASE_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Creates a doc_search tool bound to a specific vault
 * The vaultId is captured in closure so the AI doesn't need to know it
 */
export function createDocSearch(vaultId: string) {
  return tool({
    description: `Search through the documents uploaded to the current case's vault. 
      Use this tool when the user asks questions about their documents, wants to find specific information, 
      or needs to reference content from uploaded files. Returns relevant text passages with source information.
      ALWAYS use this tool first when the user asks about "the document", "my files", "what I uploaded", etc.`,
    inputSchema: z.object({
      query: z.string().describe("The search query to find relevant document content"),
      limit: z.number().optional().default(5).describe("Maximum number of results to return (default: 5)"),
    }),
    execute: async ({ query, limit }) => {
      // Handle case when no vault is selected
      if (!vaultId) {
        return {
          success: false,
          error: "No case selected. Please select a case to search its documents.",
          results: [],
        };
      }

      try {
        const response = await fetch(`${CASE_API_BASE}/vault/${vaultId}/search`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getApiKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: limit || 5,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[doc_search] API error:", response.status, errorText);
          return {
            success: false,
            error: `Search failed: ${response.status}`,
            results: [],
          };
        }

        const data = await response.json();

        // Case.dev returns { chunks: [...], sources: [...], vault_id: "..." }
        const allChunks = data.chunks || data.results || [];
        const sources = data.sources || [];

        // Respect the limit parameter
        const effectiveLimit = limit || 5;
        const chunks = allChunks.slice(0, effectiveLimit);

        // Create a map of object_id to filename
        const sourceMap = new Map(sources.map((s: { id: string; filename: string }) => [s.id, s.filename]));

        // Transform chunks to results
        const results = chunks.map(
          (chunk: {
            text?: string;
            object_id?: string;
            hybridScore?: number;
            vectorScore?: number;
            distance?: number;
          }) => ({
            text: chunk.text || "",
            source: sourceMap.get(chunk.object_id || "") || "document",
            score: chunk.hybridScore || chunk.vectorScore || (chunk.distance ? 1 - chunk.distance : 0),
          }),
        );

        return {
          success: true,
          results,
          query,
        };
      } catch (error) {
        console.error("[doc_search] Error:", error);
        return {
          success: false,
          error: "Failed to search documents",
          results: [],
        };
      }
    },
  });
}
