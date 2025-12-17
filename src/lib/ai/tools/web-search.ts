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

export const webSearch = tool({
  description:
    "Web search for external, real-time, or current knowledge. Formulate effective keyword-based queries. If one search isn't sufficient, try additional searches with varied queries. Use this only when you need external authority or market practice, not for document facts.",
  inputSchema: z.object({
    query: z.string().describe("The web search query."),
    numResults: z.number().default(8).describe("Target number of results to collect."),
  }),
  execute: async ({ query, numResults }) => {
    try {
      const response = await fetch(`${CASE_API_BASE}/search/v1/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          numResults,
          text: true,
          highlights: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[web_search] API error:", response.status, errorText);
        throw new Error(`Search API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      const sources = (data.results || []).map((item: any) => ({
        title: item.title,
        url: item.url,
        snippet: item.highlights?.join("\n") || item.snippet || item.text || "",
      }));

      return { sources, query };
    } catch (error) {
      console.error("[web_search] Error:", error);
      throw error;
    }
  },
});
