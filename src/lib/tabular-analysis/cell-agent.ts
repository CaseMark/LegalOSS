"use server";

import { generateText } from "ai";

import type { ExtractionColumn, CellValue } from "@/db/schema";
import { getLanguageModelForId } from "@/lib/ai/providers";
import { caseClient } from "@/lib/case-dev";

/**
 * Extract a cell value from a document using AI
 *
 * @param documentId - The vault object ID of the document
 * @param documentTitle - Human-readable document name
 * @param column - The column definition with extraction prompt
 * @param vaultId - The Case.dev vault ID for the matter
 * @param dependencies - Values from columns to the left (for context)
 * @param modelId - The AI model to use
 * @param onProgress - Optional callback for progress updates
 */
// eslint-disable-next-line complexity
export async function extractCellValue(
  documentId: string,
  documentTitle: string,
  column: ExtractionColumn,
  vaultId: string,
  dependencies?: Record<string, unknown>,
  modelId: string = "anthropic/claude-sonnet-4.5",
  onProgress?: (message: string) => Promise<void>,
): Promise<CellValue> {
  let tokensUsed = 0;

  try {
    // Step 1: Search for relevant content in this specific document
    await onProgress?.("Searching document...");

    const searchQuery = buildSearchQuery(column, dependencies);
    const searchResults = await caseClient.vaults.search(vaultId, {
      query: searchQuery,
      topK: 10,
      method: "hybrid",
      filters: { object_id: documentId }, // Filter to only this document
    });

    // If filtering by object_id didn't work, fall back to client-side filtering
    let resultsToUse = searchResults;
    if (searchResults.length > 0 && searchResults[0].object_id !== documentId) {
      // Filter client-side as fallback
      const docResults = searchResults.filter((r) => r.object_id === documentId);
      resultsToUse = docResults.length > 0 ? docResults : searchResults.slice(0, 5);
    }

    if (resultsToUse.length === 0) {
      return {
        value: null,
        confidence: 0,
        error: "No relevant content found in document",
        tokensUsed: 0,
      };
    }

    // Step 2: Build context from search results
    const context = resultsToUse.map((r: { text: string }, i: number) => `[Source ${i + 1}]\n${r.text}`).join("\n\n");

    const sources = resultsToUse.map((r: { object_name?: string }) => r.object_name ?? "Document");

    // Step 3: Extract value using AI
    await onProgress?.("Extracting value...");

    const systemPrompt = buildSystemPrompt(column, dependencies);
    const userPrompt = buildUserPrompt(column, documentTitle, context);

    const model = getLanguageModelForId(modelId);

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.1, // Low temperature for consistent extraction
    });

    tokensUsed = result.usage?.totalTokens ?? 0;

    // Step 4: Parse the extracted value
    const parsed = parseExtractedValue(result.text, column.dataType);

    return {
      value: parsed.value,
      confidence: parsed.confidence,
      sources,
      tokensUsed,
    };
  } catch (error) {
    console.error("[cell-agent] Extraction failed:", error);
    return {
      value: null,
      confidence: 0,
      error: error instanceof Error ? error.message : "Extraction failed",
      tokensUsed,
    };
  }
}

function buildSearchQuery(column: ExtractionColumn, dependencies?: Record<string, unknown>): string {
  // Combine column name and prompt for better search
  let query = `${column.name}: ${column.prompt}`;

  // Add dependency context for more targeted search
  if (dependencies && Object.keys(dependencies).length > 0) {
    const depContext = Object.entries(dependencies)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    query += ` (Context: ${depContext})`;
  }

  return query;
}

function buildSystemPrompt(column: ExtractionColumn, dependencies?: Record<string, unknown>): string {
  let prompt = `You are a precise data extraction assistant. Your task is to extract specific information from legal documents.

EXTRACTION TASK:
- Field: ${column.name}
- Instructions: ${column.prompt}
- Expected Type: ${column.dataType}

RULES:
1. Extract ONLY the requested information
2. If the information is not found, respond with "NOT_FOUND"
3. Be precise and concise - no explanations unless absolutely necessary
4. For dates, use ISO format (YYYY-MM-DD)
5. For boolean, respond with "true" or "false"
6. For numbers, respond with just the number (no currency symbols or units unless specified)`;

  if (dependencies && Object.keys(dependencies).length > 0) {
    prompt += `\n\nCONTEXT FROM OTHER COLUMNS:`;
    for (const [key, value] of Object.entries(dependencies)) {
      prompt += `\n- ${key}: ${value}`;
    }
  }

  return prompt;
}

function buildUserPrompt(column: ExtractionColumn, documentTitle: string, context: string): string {
  return `Document: ${documentTitle}

DOCUMENT CONTENT:
${context}

Extract the "${column.name}" field based on the instructions: "${column.prompt}"

Respond with ONLY the extracted value, nothing else.`;
}

// eslint-disable-next-line complexity
function parseExtractedValue(
  text: string,
  dataType: ExtractionColumn["dataType"],
): { value: string | number | boolean | null; confidence: number } {
  const trimmed = text.trim();

  // Handle not found
  if (trimmed === "NOT_FOUND" || trimmed.toLowerCase().includes("not found")) {
    return { value: null, confidence: 0 };
  }

  let value: string | number | boolean | null = trimmed;
  let confidence = 0.8; // Default confidence

  switch (dataType) {
    case "boolean": {
      const lower = trimmed.toLowerCase();
      if (lower === "true" || lower === "yes") {
        value = true;
        confidence = 0.9;
      } else if (lower === "false" || lower === "no") {
        value = false;
        confidence = 0.9;
      } else {
        value = null;
        confidence = 0.3;
      }
      break;
    }

    case "number": {
      const num = parseFloat(trimmed.replace(/[^0-9.-]/g, ""));
      if (!isNaN(num)) {
        value = num;
        confidence = 0.85;
      } else {
        value = null;
        confidence = 0.3;
      }
      break;
    }

    case "date": {
      // Try to parse as date
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        value = date.toISOString().split("T")[0];
        confidence = 0.85;
      } else {
        // Keep as text if can't parse
        value = trimmed;
        confidence = 0.6;
      }
      break;
    }

    case "text":
    default:
      value = trimmed;
      confidence = 0.8;
      break;
  }

  return { value, confidence };
}
