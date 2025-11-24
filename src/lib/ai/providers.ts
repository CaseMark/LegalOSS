import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

// Create Case.dev provider using OpenAI-compatible interface
// Case.dev's /llm/v1 endpoint is OpenAI-compatible and routes to all providers
const casedev = createOpenAICompatible({
  name: "casedev",
  baseURL: `${CASE_API_URL}/llm/v1`,
  headers: {
    Authorization: `Bearer ${CASE_API_KEY}`,
  },
});

/**
 * Get the appropriate language model for a given model ID
 * All models go through Case.dev's OpenAI-compatible endpoint
 */
export function getLanguageModelForId(modelId: string) {
  // Case.dev routes ALL models: OpenAI, Anthropic, Baseten, etc.
  return casedev(modelId);
}
