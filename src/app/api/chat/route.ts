import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  wrapLanguageModel,
  extractReasoningMiddleware,
  stepCountIs,
} from "ai";

import { getLanguageModelForId } from "@/lib/ai/providers";
import { caseDevTools, vaultFilesystemTools } from "@/lib/ai/tools";
import { caseDevApiTools } from "@/lib/ai/tools/casedev-api";
import { requirePermission } from "@/lib/auth/session";

const CASE_API_KEY = process.env.CASE_API_KEY;

// Note: Using Node.js runtime for SQLite compatibility
// export const runtime = "edge";

export async function POST(req: Request) {
  console.log("[Chat] ==================== REQUEST RECEIVED ====================");

  try {
    const user = await requirePermission("chat_ai.use");
    console.log("[Chat] User authenticated:", user.id);

    if (!CASE_API_KEY) {
      return new Response("CASE_API_KEY not configured", { status: 500 });
    }

    const requestBody = await req.json();
    console.log("[Chat] Full request body:", JSON.stringify(requestBody, null, 2));

    const {
      messages,
      model,
      temperature,
      max_tokens,
      top_p,
      systemPrompt,
      enabledTools,
      selectedVaults: incomingSelectedVaults = [],
    } = requestBody;

    const selectedVaults: string[] = Array.isArray(incomingSelectedVaults)
      ? incomingSelectedVaults.map((vaultId: any) => String(vaultId))
      : [];

    console.log("[Chat] Request:", {
      model,
      messageCount: messages?.length,
      temperature,
      max_tokens,
      toolsEnabled: enabledTools,
    });

    // Build tools: Case.dev API tools (always available unless disabled) + optional legacy tools
    const activeTools: Record<string, any> = {};
    const apiToolEnabled = (toolName: string) => {
      if (!enabledTools || enabledTools[toolName] === undefined) return true;
      return !!enabledTools[toolName];
    };

    // Add direct Case.dev API tools (primary demo surface)
    Object.entries(caseDevApiTools).forEach(([toolName, toolImpl]) => {
      if (apiToolEnabled(toolName)) {
        activeTools[toolName] = toolImpl;
      }
    });

    // Add vault filesystem tools if vaults are selected
    if (selectedVaults && selectedVaults.length > 0) {
      const fsTools = vaultFilesystemTools({ selectedVaults });
      Object.assign(activeTools, fsTools.tools);
    }

    // Legacy tools (kept for backwards compatibility, but Case.dev API tools are preferred)
    if (enabledTools) {
      Object.keys(caseDevTools).forEach((toolName) => {
        if (enabledTools[toolName] && !activeTools[toolName]) {
          activeTools[toolName] = caseDevTools[toolName as keyof typeof caseDevTools];
        }
      });
    }

    // Use custom system prompt from user, or build default with vault context
    let systemMessage =
      systemPrompt || `You are a helpful AI assistant with access to Case.dev tools for legal workflows.`;

    // Append vault context with EXPLICIT instructions
    if (selectedVaults && selectedVaults.length > 0) {
      systemMessage += `\n\n=== SELECTED VAULT IDS (USE THESE) ===\n${selectedVaults.map((id, i) => `${i + 1}. ${id}`).join("\n")}

CRITICAL: When calling tools that need a vaultId parameter, you MUST use one of the vault IDs above.

Examples:
- listVaultObjects({ vaultId: "${selectedVaults[0]}" })
- searchVault({ vaultId: "${selectedVaults[0]}", query: "medical records", method: "hybrid" })
- getVault({ vaultId: "${selectedVaults[0]}" })

DO NOT call these tools with empty parameters {}. Always provide the required vaultId from the list above.`;
    }

    // Get language model
    let languageModel = getLanguageModelForId(model);

    // Wrap reasoning models to extract <think> blocks (like CaseChat does)
    const reasoningModels = new Set([
      "casemark/casemark-core-1",
      "casemark/casemark-core-1.5",
      "openai/gpt-5",
      "openai/o1",
      "openai/o3-mini",
      "anthropic/claude-sonnet-4",
    ]);

    if (reasoningModels.has(model)) {
      languageModel = wrapLanguageModel({
        model: languageModel,
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });
    }

    const useTools = Object.keys(activeTools).length > 0;
    console.log("[Chat] Using tools:", useTools, Object.keys(activeTools));

    // Log available tools for debugging
    console.log("[Chat] Active tools:", Object.keys(activeTools));

    // Use AI SDK standard pattern (per official docs)
    const streamConfig: any = {
      model: languageModel,
      system: systemMessage,
      messages: convertToModelMessages(messages),
      temperature: temperature ?? 1,
      maxTokens: max_tokens ?? 4096,
      topP: top_p ?? 1,
      ...(useTools
        ? {
            tools: activeTools,
            maxSteps: 20, // Allow multi-turn tool execution
            stopWhen: stepCountIs(20), // Stop after 20 steps like Thurgood
            toolChoice: "auto", // Let model decide when to use tools
          }
        : {}),
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }: any) => {
        console.log("[Chat] Step finished:", {
          finishReason,
          toolCallsCount: toolCalls?.length || 0,
          toolNames: toolCalls?.map((tc: any) => tc.toolName) || [],
          hasText: !!text,
          textLength: text?.length || 0,
        });
      },
    };

    const result = streamText(streamConfig);

    console.log("[Chat] Returning toUIMessageStreamResponse()...");
    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return new Response(error.message, { status: 403 });
    }
    console.error("[LLM Chat] Error:", error);
    return new Response("Failed to generate response", { status: 500 });
  }
}
