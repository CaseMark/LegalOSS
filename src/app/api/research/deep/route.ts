import { NextRequest } from "next/server";

import { getDb } from '@/db';
import { chats, messages } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth/session';

const CASE_API_BASE = "https://api.case.dev";

function getApiKey(): string {
  const key = process.env.CASE_API_KEY;
  if (!key) throw new Error("CASE_API_KEY not set");
  return key;
}

// Legal domains for comprehensive search
const LEGAL_DOMAINS = [
  "law.cornell.edu",
  "findlaw.com",
  "justia.com",
  "casetext.com",
  "courtlistener.com",
  "scholar.google.com",
  "supremecourt.gov",
  "uscourts.gov",
  "oyez.org",
  "law.justia.com",
  "lexisnexis.com",
  "westlaw.com",
  "bloomberglaw.com",
  "law.com",
  "abajournal.com",
  "scotusblog.com",
  "lawfaremedia.org",
  "nytimes.com",
  "washingtonpost.com",
  "reuters.com",
];

// Use Gemini 3 Pro Preview for massive context window - can handle 100+ sources
const DEEP_RESEARCH_MODEL = "google/gemini-3-pro-preview";

const INITIAL_QUERY_PROMPT = `You are a legal research strategist. Generate 15-20 diverse search queries to comprehensively research this legal question.

Cover:
1. Core legal issue (3-4 variations with different phrasing)
2. Landmark Supreme Court cases on this topic
3. Recent circuit court decisions (last 3-5 years)  
4. Federal statutes and regulations
5. State law variations (if applicable)
6. Law review articles and treatises
7. Regulatory guidance and agency interpretations
8. Procedural and jurisdictional aspects
9. Related/analogous legal doctrines
10. Recent news and developments

Be SPECIFIC. Use exact legal terms, case names if known, statute citations.
Return ONLY a JSON array of search query strings.`;

const FOLLOWUP_QUERY_PROMPT = `You are a legal research strategist analyzing initial search results to identify GAPS.

Based on the research question and results so far, generate 10-15 ADDITIONAL search queries to fill gaps:
- Missing jurisdictions or circuits not well covered
- Specific cases mentioned but not fully retrieved
- Statutory sections referenced but not found
- Regulatory interpretations lacking
- Procedural aspects missing
- Recent developments not captured
- Counter-arguments or minority positions
- Practical implementation issues

Focus on what's MISSING, not what we already have.
Return ONLY a JSON array of search query strings.`;

const DEEP_DIVE_QUERY_PROMPT = `Based on the research so far, generate 8-12 highly targeted DEEP DIVE queries:
- Specific case names that appeared in results but need full text
- Exact statutory citations for deeper analysis
- Agency guidance documents or opinion letters
- Law firm client alerts on this specific issue
- Bar association resources or practice guides
- Academic commentary on specific doctrinal points

These should be PRECISE, TARGETED queries for specific documents.
Return ONLY a JSON array of search query strings.`;

const SYNTHESIS_PROMPT = `You are a research analyst writing for EXPERT attorneys who know the law cold. Skip the basics. Go straight to the tactical analysis.

## CRITICAL RULES:
- NO memo headers, dates, "TO:", "FROM:", etc. Start with "# " heading immediately.
- NO hand-holding. Assume reader is a senior litigator who needs answers, not explanations of what a statute is.
- NO filler. Every sentence must add value.
- Be DIRECT. State conclusions first, then support.

## CITATION FORMAT:
Use Unicode superscripts: ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ¹⁰ ¹¹ ¹² etc.
NO HTML. NO brackets. Just: "The holding in Smith controls here.³"
Cite aggressively - 3-5 per paragraph minimum.

## WHAT EXPERT LAWYERS NEED:

### 1. The Bottom Line (start here)
- What's the answer? Win or lose?
- What's the strongest argument each way?
- What's the risk profile?

### 2. Key Holdings That Matter
- Quote the operative language from controlling cases
- Identify the specific elements/factors courts apply
- Note circuit splits or jurisdictional variations that affect strategy

### 3. Factual Distinctions
- What facts trigger different outcomes?
- Where are the pressure points in the doctrine?
- What factual development would change the analysis?

### 4. Procedural Considerations
- Standard of review
- Burden allocation and shifting
- Timing and preservation issues
- Discovery implications

### 5. Strategic Analysis
- Best arguments for each side
- Weaknesses to address preemptively
- Settlement leverage points
- Alternative theories if primary fails

### 6. Risk Matrix
- Probability assessments for different outcomes
- Worst case / best case / likely case
- Litigation cost considerations

### 7. Concrete Next Steps
- Specific actions to take
- Documents/evidence to gather
- Expert needs
- Timeline considerations

## LENGTH: 15,000-25,000+ words. Be exhaustive but never repetitive. Every section should teach something new.

Write like you're billing $2,000/hour and the client expects actionable intelligence, not book reports.`;

interface SearchResult {
  title: string;
  url: string;
  text?: string;
  publishedDate?: string;
  score: number;
}

async function searchWeb(query: string, numResults = 40): Promise<SearchResult[]> {
  const response = await fetch(`${CASE_API_BASE}/search/v1/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      numResults,
      includeDomains: LEGAL_DOMAINS,
      includeText: true,
    }),
  });

  if (!response.ok) {
    console.error("Search failed:", await response.text());
    return [];
  }

  const data = await response.json();
  return data.results || [];
}

async function generateQueries(prompt: string, context: string): Promise<string[]> {
  const response = await fetch(`${CASE_API_BASE}/llm/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4.5",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: context },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "[]";

  try {
    // Handle markdown code blocks
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function executeSearchPhase(
  queries: string[],
  seenUrls: Set<string>,
  numResultsPerQuery = 40,
): Promise<SearchResult[]> {
  const newResults: SearchResult[] = [];

  // Run all searches in parallel
  const searchPromises = queries.map((q) => searchWeb(q, numResultsPerQuery));
  const searchResultsArrays = await Promise.all(searchPromises);

  for (const results of searchResultsArrays) {
    for (const result of results) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        newResults.push(result);
      }
    }
  }

  return newResults;
}

function summarizeResultsForFollowup(results: SearchResult[]): string {
  // Create a brief summary of what we've found so far for the AI to analyze gaps
  const categories: Record<string, string[]> = {
    cases: [],
    statutes: [],
    regulations: [],
    secondary: [],
    news: [],
  };

  for (const r of results.slice(0, 100)) {
    const url = r.url.toLowerCase();
    const title = r.title;

    if (url.includes("courtlistener") || url.includes("justia.com/cases") || url.includes("casetext")) {
      categories.cases.push(title);
    } else if (url.includes("cornell.edu/uscode") || url.includes("law.cornell.edu")) {
      categories.statutes.push(title);
    } else if (url.includes("ecfr.gov") || url.includes("federalregister")) {
      categories.regulations.push(title);
    } else if (url.includes("scholar.google") || title.toLowerCase().includes("law review")) {
      categories.secondary.push(title);
    } else {
      categories.news.push(title);
    }
  }

  let summary = `Sources found so far (${results.length} total):\n\n`;
  for (const [cat, titles] of Object.entries(categories)) {
    if (titles.length > 0) {
      summary += `${cat.toUpperCase()} (${titles.length}):\n`;
      summary +=
        titles
          .slice(0, 15)
          .map((t) => `- ${t}`)
          .join("\n") + "\n\n";
    }
  }

  return summary;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { query, model, sources } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const allResults: SearchResult[] = [];
          const seenUrls = new Set<string>();
          let allQueries: string[] = [];

          // ========== PHASE 1: Initial broad search ==========
          send({ type: "status", status: "planning", message: "Phase 1: Generating initial research strategy..." });

          const initialQueries = await generateQueries(INITIAL_QUERY_PROMPT, `Research question: ${query}`);
          const phase1Queries = [query, ...initialQueries];
          allQueries = [...phase1Queries];
          send({ type: "queries", queries: phase1Queries });

          send({
            type: "status",
            status: "researching",
            message: `Phase 1: Executing ${phase1Queries.length} searches...`,
          });
          const phase1Results = await executeSearchPhase(phase1Queries, seenUrls, 25);
          allResults.push(...phase1Results);

          // Send phase 1 results
          for (const result of phase1Results) {
            send({
              type: "result",
              result: {
                id: crypto.randomUUID(),
                category: inferCategory(result),
                title: result.title,
                source: new URL(result.url).hostname,
                snippet: (result.text || "").slice(0, 500),
                url: result.url,
                date: result.publishedDate,
                relevance: Math.round((result.score || 0.8) * 100),
              },
            });
          }

          send({
            type: "status",
            status: "analyzing",
            message: `Phase 1 complete: ${allResults.length} sources. Analyzing gaps...`,
          });

          // ========== PHASE 2: Gap analysis and followup ==========
          const resultsSummary = summarizeResultsForFollowup(allResults);
          const followupContext = `Original research question: ${query}\n\n${resultsSummary}\n\nGenerate additional queries to fill gaps in the research.`;

          const followupQueries = await generateQueries(FOLLOWUP_QUERY_PROMPT, followupContext);

          if (followupQueries.length > 0) {
            allQueries = [...allQueries, ...followupQueries];
            send({ type: "queries", queries: followupQueries });
            send({
              type: "status",
              status: "researching",
              message: `Phase 2: Executing ${followupQueries.length} followup searches...`,
            });

            const phase2Results = await executeSearchPhase(followupQueries, seenUrls, 20);
            allResults.push(...phase2Results);

            for (const result of phase2Results) {
              send({
                type: "result",
                result: {
                  id: crypto.randomUUID(),
                  category: inferCategory(result),
                  title: result.title,
                  source: new URL(result.url).hostname,
                  snippet: (result.text || "").slice(0, 500),
                  url: result.url,
                  date: result.publishedDate,
                  relevance: Math.round((result.score || 0.8) * 100),
                },
              });
            }
          }

          send({
            type: "status",
            status: "analyzing",
            message: `Phase 2 complete: ${allResults.length} sources. Deep dive analysis...`,
          });

          // ========== PHASE 3: Deep dive targeted queries ==========
          const updatedSummary = summarizeResultsForFollowup(allResults);
          const deepDiveContext = `Original research question: ${query}\n\n${updatedSummary}\n\nGenerate precise, targeted queries for specific documents and authorities.`;

          const deepDiveQueries = await generateQueries(DEEP_DIVE_QUERY_PROMPT, deepDiveContext);

          if (deepDiveQueries.length > 0) {
            allQueries = [...allQueries, ...deepDiveQueries];
            send({ type: "queries", queries: deepDiveQueries });
            send({
              type: "status",
              status: "researching",
              message: `Phase 3: Executing ${deepDiveQueries.length} deep dive searches...`,
            });

            const phase3Results = await executeSearchPhase(deepDiveQueries, seenUrls, 15);
            allResults.push(...phase3Results);

            for (const result of phase3Results) {
              send({
                type: "result",
                result: {
                  id: crypto.randomUUID(),
                  category: inferCategory(result),
                  title: result.title,
                  source: new URL(result.url).hostname,
                  snippet: (result.text || "").slice(0, 500),
                  url: result.url,
                  date: result.publishedDate,
                  relevance: Math.round((result.score || 0.8) * 100),
                },
              });
            }
          }

          send({
            type: "status",
            status: "analyzing",
            message: `Research complete: ${allResults.length} unique sources from ${allQueries.length} queries. Synthesizing...`,
          });

          // ========== CONTEXT ENGINEERING ==========
          // Smart compression to fit within model limits while maximizing value

          // Sort by relevance score and dedupe
          const sortedResults = [...allResults].sort((a, b) => (b.score || 0.5) - (a.score || 0.5));

          // Tier 1: Top 50 sources get full text (up to 4000 chars each)
          // Tier 2: Next 100 sources get truncated text (up to 1500 chars)
          // Tier 3: Remaining sources get title + URL only (for citation reference)
          const TIER1_COUNT = 50;
          const TIER2_COUNT = 100;
          const TIER1_TEXT_LIMIT = 4000;
          const TIER2_TEXT_LIMIT = 1500;
          const MAX_CONTEXT_SOURCES = 300; // Cap total sources in context

          const contextSources = sortedResults.slice(0, MAX_CONTEXT_SOURCES);

          let context = `# Research Query\n${query}\n\n`;

          // Compact query list
          context += `# Search Strategy (${allQueries.length} queries across 3 phases)\n`;
          context += allQueries
            .slice(0, 20)
            .map((q, i) => `${i + 1}. ${q}`)
            .join("\n");
          if (allQueries.length > 20) {
            context += `\n... and ${allQueries.length - 20} more queries\n`;
          }
          context += "\n\n";

          // Add user-provided sources (limited)
          if (sources && sources.length > 0) {
            context += "# User-Provided Sources\n";
            for (const source of sources.slice(0, 5)) {
              const truncatedContent = (source.content || "").slice(0, 3000);
              context += `## ${source.title}\n${truncatedContent}\n\n`;
            }
          }

          // Build tiered source context
          context += `# Sources (${allResults.length} found, ${contextSources.length} included)\n`;
          context += `Cite using Unicode superscripts: ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ¹⁰ etc.\n\n`;

          for (let i = 0; i < contextSources.length; i++) {
            const result = contextSources[i];
            const superNum = (i + 1)
              .toString()
              .split("")
              .map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[parseInt(d)])

            context += `## ${superNum} ${result.title}\n`;
            context += `${result.url}`;
            if (result.publishedDate) {
              context += ` | ${result.publishedDate}`;
            }
            context += "\n";

            // Tiered text inclusion
            const rawText = result.text || "";
            if (i < TIER1_COUNT) {
              // Tier 1: Full text (truncated to limit)
              const text = rawText.slice(0, TIER1_TEXT_LIMIT);
              if (text) {
                context += `${text}${rawText.length > TIER1_TEXT_LIMIT ? "..." : ""}\n`;
              }
            } else if (i < TIER1_COUNT + TIER2_COUNT) {
              // Tier 2: Truncated text
              const text = rawText.slice(0, TIER2_TEXT_LIMIT);
              if (text) {
                context += `${text}${rawText.length > TIER2_TEXT_LIMIT ? "..." : ""}\n`;
              }
            }
            // Tier 3: Just title + URL (already added above)

            context += "\n";
          }

          // Hard limit on context size (roughly 800K chars = ~200K tokens for safety)
          const MAX_CONTEXT_CHARS = 800000;
          if (context.length > MAX_CONTEXT_CHARS) {
            console.log(`Context too large (${context.length} chars), truncating to ${MAX_CONTEXT_CHARS}`);
            context = context.slice(0, MAX_CONTEXT_CHARS) + "\n\n[Context truncated for length]";
          }

          console.log(`Final context size: ${context.length} chars, ${contextSources.length} sources`);

          // Generate comprehensive synthesis
          send({
            type: "status",
            status: "synthesizing",
            message: `Synthesizing ${contextSources.length} sources into research memo...`,
          });

          const llmResponse = await fetch(`${CASE_API_BASE}/llm/v1/chat/completions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${getApiKey()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: DEEP_RESEARCH_MODEL,
              messages: [
                { role: "system", content: SYNTHESIS_PROMPT },
                { role: "user", content: context },
              ],
              stream: true,
              temperature: 0.2, // Lower temperature for more precise legal writing
              max_tokens: 32000, // Reasonable max for comprehensive report
            }),
          });

          if (!llmResponse.ok) {
            const err = await llmResponse.text();
            throw new Error(`LLM request failed: ${err}`);
          }

          const reader = llmResponse.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          let buffer = "";
          let fullSynthesis = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullSynthesis += content;
                    send({ type: "synthesis", content });
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }

          // Save as a chat for persistence
          let chatId: string | null = null;
          try {
            const db = await getDb();
            // Create the chat
            const newChatId = crypto.randomUUID();
            const [newChat] = await db
              .insert(chats)
              .values({
                id: newChatId,
                userId: user.id,
                title: `Research: ${query.slice(0, 50)}${query.length > 50 ? "..." : ""}`,
              })
              .returning();

            chatId = newChat.id;

            // Save the user's research query
            await db.insert(messages).values({
              id: crypto.randomUUID(),
              chatId: newChat.id,
              role: "user",
              content: JSON.stringify({ type: "text", text: `[Deep Research]\n\n${query}` }),
            });

            // Save the synthesis as assistant response
            await db.insert(messages).values({
              id: crypto.randomUUID(),
              chatId: newChat.id,
              role: "assistant",
              content: JSON.stringify({ type: "text", text: fullSynthesis }),
            });
          } catch (dbError) {
            console.error("Failed to save research as chat:", dbError);
          }

          send({ type: "complete", totalSources: allResults.length, chatId });
        } catch (error) {
          console.error("Deep research error:", error);
          send({ type: "error", message: String(error) });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Research error:", error);
    return new Response(JSON.stringify({ error: "Research failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function inferCategory(result: { url: string; title: string; text?: string }): string {
  const url = result.url.toLowerCase();
  const title = result.title.toLowerCase();
  const text = (result.text || "").toLowerCase();

  // Check URL domain for category hints
  if (url.includes("cornell.edu") && url.includes("/uscode")) {
    return "statute";
  }
  if (url.includes("ecfr.gov") || url.includes("federalregister.gov")) {
    return "regulation";
  }
  if (url.includes("scholar.google") || title.includes("law review") || title.includes("journal")) {
    return "secondary";
  }
  if (url.includes("courtlistener") || url.includes("supremecourt.gov") || url.includes("uscourts.gov")) {
    return "case";
  }
  if (url.includes("justia.com/cases") || url.includes("casetext.com")) {
    return "case";
  }

  // Default to case for legal domains
  return "case";
}

