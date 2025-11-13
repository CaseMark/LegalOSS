import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

// Note: Using Node.js runtime for SQLite compatibility
// export const runtime = "edge";

export async function POST(req: Request) {
  try {
    await requirePermission("chat_ai.use");

    if (!CASE_API_KEY) {
      return new Response("CASE_API_KEY not configured", { status: 500 });
    }

    const { messages, model, temperature, max_tokens, top_p } = await req.json();

    console.log("[LLM Chat] Request:", { model, messageCount: messages.length, temperature, max_tokens });

    const response = await fetch(`${CASE_API_URL}/llm/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 1,
        max_tokens: max_tokens ?? 4096,
        top_p: top_p ?? 1,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[LLM Chat] Error:", error);
      return new Response(error, { status: response.status });
    }

    // Return the streaming response directly
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return new Response(error.message, { status: 403 });
    }
    console.error("[LLM Chat] Error:", error);
    return new Response("Failed to generate response", { status: 500 });
  }
}
