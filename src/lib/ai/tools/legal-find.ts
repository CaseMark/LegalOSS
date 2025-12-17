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

// Preferred hosts for legal sources (ranked by reliability)
const PreferredHosts = {
  case: ["supremecourt.gov", "uscourts.gov", "govinfo.gov", "law.cornell.edu", "courtlistener.com"],
  statute: ["uscode.house.gov", "law.cornell.edu", "govinfo.gov"],
  regulation: ["ecfr.gov", "law.cornell.edu", "govinfo.gov"],
} as const;

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export const legalFind = tool({
  description:
    "Step 1 of legal research: Find legal sources (cases, statutes, regulations). Returns ranked candidates with normalized metadata. Prefer federal/state official sites. Return top 3-5 candidates for verification.",
  inputSchema: z.object({
    type: z.enum(["case", "statute", "regulation"]).describe("Type of legal source to find"),
    jurisdiction: z
      .object({
        country: z.string().default("US"),
        level: z.string().optional(),
        court: z.string().optional(),
        state: z.string().optional(),
      })
      .optional()
      .describe("Jurisdiction details"),
    citation: z.string().optional().describe("Exact citation if known"),
    partyNames: z.array(z.string()).optional().describe("For cases: party names"),
    code: z
      .object({
        system: z.string().optional(),
        title: z.string().optional(),
        section: z.string().optional(),
      })
      .optional()
      .describe("For statutes/regs: code identifiers"),
    yearStart: z.number().optional(),
    yearEnd: z.number().optional(),
    keywords: z.string().optional(),
    numResults: z.number().default(10),
  }),
  execute: async (input) => {
    const { type, jurisdiction, citation, partyNames, code, yearStart, yearEnd, keywords, numResults } = input;

    // Build a structured query string
    const parts: string[] = [];
    if (citation) parts.push(`citation:"${citation}"`);
    if (partyNames?.length) parts.push(partyNames.join(" v. "));
    if (code?.system) parts.push(code.system);
    if (code?.title) parts.push(`Title ${code.title}`);
    if (code?.section) parts.push(`§ ${code.section}`);
    if (jurisdiction?.court) parts.push(jurisdiction.court);
    if (jurisdiction?.state) parts.push(jurisdiction.state);
    if (yearStart && yearEnd) parts.push(`${yearStart}..${yearEnd}`);
    if (keywords) parts.push(keywords);
    const query = parts.filter(Boolean).join(" ");

    try {
      const response = await fetch(`${CASE_API_BASE}/search/v1/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.length ? query : (keywords ?? ""),
          numResults,
          text: true,
          highlights: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[legal_find] API error:", response.status, errorText);
        throw new Error(`Search API error: ${response.status}`);
      }

      const data = await response.json();

      const sourceType = type ?? "case";
      const preferred = new Set<string>(PreferredHosts[sourceType] || []);

      const candidates = (data.results || []).map((r: any) => {
        const host = hostnameFromUrl(r.url);
        const rankBonus = preferred.has(host) ? 0.2 : 0;
        return {
          url: r.url,
          sourceHost: host,
          title: r.title,
          snippet: r.highlights?.join("\n") || r.text || "",
          type,
          normalizedCitation: citation || undefined,
          rankScore: (r.score ?? 0) + rankBonus,
        };
      });

      // Sort by rank score (higher is better)
      candidates.sort((a: any, b: any) => b.rankScore - a.rankScore);

      return { query, candidates };
    } catch (error) {
      console.error("[legal_find] Error:", error);
      throw error;
    }
  },
});
