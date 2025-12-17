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

// Fetch page content with timeout and retries
async function fetchTextWithRetry(url: string, attempts = 3, timeoutMs = 15000): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LegalOSS/1.0)",
        },
      });
      clearTimeout(id);
      if (!res.ok) continue;
      const text = await res.text();
      if (text && text.length > 0) return text;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  return "";
}

function includesAll(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.every((n) => lower.includes((n || "").toLowerCase()));
}

export const legalVerify = tool({
  description:
    "Step 2 of legal research: Verify each candidate source contains the target identifiers (citation, parties, code sections). If verificationScore < 0.6, try the next candidate. Never emit a citation without successful verification.",
  inputSchema: z.object({
    target: z.object({
      type: z.enum(["case", "statute", "regulation"]),
      citation: z.string().optional(),
      partyNames: z.array(z.string()).optional(),
      court: z.string().optional(),
      code: z
        .object({
          system: z.string().optional(),
          title: z.string().optional(),
          section: z.string().optional(),
        })
        .optional(),
      year: z.number().optional(),
      jurisdiction: z
        .object({
          country: z.string().optional(),
          state: z.string().optional(),
          court: z.string().optional(),
        })
        .partial()
        .optional(),
    }),
    candidate: z.object({
      url: z.string(),
      title: z.string().optional(),
      type: z.string().optional(),
    }),
  }),
  execute: async ({ target, candidate }) => {
    // Fetch page content
    const html = await fetchTextWithRetry(candidate.url);
    if (!html || html.length < 500) {
      return {
        verified: false,
        verificationScore: 0,
        reasons: ["empty_or_short_page"],
      };
    }

    const reasons: string[] = [];
    let score = 0;
    const hay = html.toLowerCase();

    // Check for citation match
    if (target.citation) {
      if (hay.includes(target.citation.toLowerCase())) {
        score += 0.4;
        reasons.push("citation_match");
      } else {
        reasons.push("citation_missing");
      }
    }

    // Check for party names
    const partyNeedles = (target.partyNames || []).filter(Boolean);
    if (partyNeedles.length && includesAll(html, partyNeedles)) {
      score += 0.2;
      reasons.push("parties_match");
    }

    // Check for court
    if (target.court && includesAll(hay, [target.court])) {
      score += 0.1;
      reasons.push("court_match");
    }

    // Check for code references
    if (target.code?.title && includesAll(hay, [String(target.code.title)])) {
      score += 0.1;
      reasons.push("code_title_match");
    }
    if (target.code?.section && includesAll(hay, [String(target.code.section)])) {
      score += 0.1;
      reasons.push("code_section_match");
    }

    // Use AI judge for more nuanced verification
    let aiVerdict: any = null;
    try {
      const snippet = html.slice(0, 15000);
      const judgeResponse = await fetch(`${CASE_API_BASE}/llm/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                'You are a legal source verifier. Return ONLY JSON. Fields: {"isPrimarySource":boolean,"isOfficialOrCanonical":boolean,"documentType":"case|statute|regulation|other","jurisdictionMatch":boolean,"citationPresent":boolean,"isCurrent":boolean,"confidence":number}. Be strict about verification.',
            },
            {
              role: "user",
              content: `Verify this legal source:\n\nTarget: ${JSON.stringify(target)}\nURL: ${candidate.url}\n\nPage content (excerpt):\n${snippet}`,
            },
          ],
          temperature: 0,
          max_tokens: 256,
        }),
      });

      if (judgeResponse.ok) {
        const judgeData = await judgeResponse.json();
        const content = judgeData.choices?.[0]?.message?.content || "";
        const match = content.match(/\{[\s\S]*\}/);
        aiVerdict = JSON.parse(match ? match[0] : content);

        if (aiVerdict) {
          if (aiVerdict.isPrimarySource) {
            score += 0.15;
            reasons.push("ai_primary_source");
          }
          if (aiVerdict.isOfficialOrCanonical) {
            score += 0.1;
            reasons.push("ai_official");
          }
          if (aiVerdict.citationPresent) {
            score += 0.1;
            reasons.push("ai_citation_present");
          }
          if (aiVerdict.jurisdictionMatch) {
            score += 0.05;
            reasons.push("ai_jurisdiction_match");
          }
          const conf = Math.max(0, Math.min(1, Number(aiVerdict.confidence ?? 0)));
          score += 0.1 * conf;
        }
      }
    } catch (e) {
      console.warn("[legal_verify] AI judge failed:", e);
      reasons.push("ai_judge_failed");
    }

    const verified = score >= 0.6;

    return {
      verified,
      verificationScore: Number(score.toFixed(2)),
      reasons,
      canonicalized: {
        url: candidate.url,
        citation: target.citation,
      },
      aiVerdict,
    };
  },
});
