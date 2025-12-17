"use client";

import { useState, useEffect, useRef } from "react";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { RotateCcw, Bot, User, Send, Brain, ChevronRight } from "lucide-react";
import { Streamdown } from "streamdown";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useVaultsWithStats } from "@/lib/hooks/use-vault-stats";

import { MaxLengthSelector } from "./components/maxlength-selector";
import { ModelSelector } from "./components/model-selector";
import { TemperatureSelector } from "./components/temperature-selector";
import { ToolInvocation } from "./components/tool-invocation";
import { defaultEnabledToolState } from "./components/tool-options";
import { ToolsConfig } from "./components/tools-config";
import { TopPSelector } from "./components/top-p-selector";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PlaygroundPage() {
  const [selectedModel, setSelectedModel] = useState("casemark/casemark-core-1.5");
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([2048]);
  const [topP, setTopP] = useState([0.9]);
  const [systemPrompt, setSystemPrompt] = useState(
    `You are an expert legal AI assistant with full access to Case.dev's platform.

CRITICAL TOOL USAGE:
- NEVER put tool calls inside <think> blocks
- NEVER use XML syntax like <tool_call>name</tool_call>
- Just decide to use a tool - the system calls it automatically
- Think about which tool, then let the system execute it

WORKFLOW: When users ask about vaults/documents:
1. Use tools to gather data (listVaults, searchVault, listVaultObjects) 
2. Call multiple tools if needed - you have 20 steps available
3. After results return, analyze and synthesize them
4. Provide clear, actionable insights based on the data
5. Suggest next steps

ANALYSIS GUIDELINES:
- Summarize search results with key findings
- Highlight relevant passages from documents
- Identify patterns across multiple files
- Provide context and legal significance
- Always cite specific documents/sources

AVAILABLE TOOLS:
- Vault Management: listVaults, createVault, getVault
- File Operations: listVaultObjects, triggerIngestion
- Search: searchVault (fast/hybrid/entity/global/local methods)
- Workflows: searchWorkflows (discover workflows), getWorkflow (get details), executeWorkflow (run workflows)
- Processing: submitOCR

Example: Don't just say "Found 3 results". Say "I found 3 relevant passages about post-operative care. The deposition shows Dr. Johnson testified that standard protocol requires vital signs every 15 minutes..."

Be thorough, analytical, and actionable.`,
  );
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>(() => ({
    ...defaultEnabledToolState,
  }));
  const [selectedVaults, setSelectedVaults] = useState<string[]>([]);

  // Use refs to avoid stale closure in prepareSendMessagesRequest
  const selectedModelRef = useRef(selectedModel);
  const temperatureRef = useRef(temperature);
  const maxTokensRef = useRef(maxTokens);
  const topPRef = useRef(topP);
  const systemPromptRef = useRef(systemPrompt);
  const enabledToolsRef = useRef(enabledTools);
  const selectedVaultsRef = useRef(selectedVaults);

  // Update refs when values change
  useEffect(() => {
    selectedModelRef.current = selectedModel;
    temperatureRef.current = temperature;
    maxTokensRef.current = maxTokens;
    topPRef.current = topP;
    systemPromptRef.current = systemPrompt;
    enabledToolsRef.current = enabledTools;
    selectedVaultsRef.current = selectedVaults;
  }, [selectedModel, temperature, maxTokens, topP, systemPrompt, enabledTools, selectedVaults]);

  const { data: modelsData } = useSWR("/api/llm/models", fetcher);
  const { vaults, isLoading: vaultsLoading } = useVaultsWithStats();

  const models = modelsData?.data || [];

  // Auto-select vaults that have indexed content on load
  useEffect(() => {
    if (!vaultsLoading && vaults.length > 0 && selectedVaults.length === 0) {
      const indexedVaults = vaults.filter((v) => v.objectCount > 0);
      if (indexedVaults.length > 0) {
        setSelectedVaults(indexedVaults.map((v) => v.id));
      }
    }
  }, [vaults, vaultsLoading, selectedVaults.length]);

  const chatHook = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ messages, id, body }) {
        // Use refs to get current values (avoid stale closure)
        const currentParams = {
          model: selectedModelRef.current,
          temperature: temperatureRef.current[0],
          max_tokens: maxTokensRef.current[0],
          top_p: topPRef.current[0],
          systemPrompt: systemPromptRef.current,
          enabledTools: enabledToolsRef.current,
          selectedVaults: selectedVaultsRef.current,
        };

        console.log("[Playground] Sending request with:", currentParams);

        return {
          body: {
            messages,
            ...body,
            ...currentParams,
          },
        };
      },
    }),
    onError: (error) => {
      console.error("[Playground] Chat error:", error);
    },
    onFinish: (message) => {
      console.log("[Playground] Message finished:", message);
    },
  });

  console.log("[Playground] Status:", chatHook.status, "Messages:", chatHook.messages.length);

  const { messages, sendMessage, stop, status } = chatHook;
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [viewportReady, setViewportReady] = useState(false);
  const isUserScrollingRef = useRef(false);

  // Check if user is near bottom of scroll area
  const checkIfNearBottom = () => {
    if (!scrollViewportRef.current) return false;

    const threshold = 100; // pixels from bottom
    const scrollTop = scrollViewportRef.current.scrollTop;
    const scrollHeight = scrollViewportRef.current.scrollHeight;
    const clientHeight = scrollViewportRef.current.clientHeight;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    return distanceFromBottom < threshold;
  };

  // Find and attach scroll listener to viewport
  useEffect(() => {
    // Find viewport element (it's rendered by ScrollArea)
    const findViewport = () => {
      // Scope to playground's ScrollArea by finding it within the current component tree
      const scrollArea = document.querySelector('[data-slot="scroll-area"]');
      if (!scrollArea) return null;
      const viewport = scrollArea.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
      return viewport;
    };

    let cleanup: (() => void) | null = null;
    let retries = 0;
    const maxRetries = 10;

    const tryFindViewport = () => {
      const viewport = findViewport();
      if (viewport) {
        scrollViewportRef.current = viewport;
        setViewportReady(true);

        const handleScroll = () => {
          isUserScrollingRef.current = true;
          setIsNearBottom(checkIfNearBottom());

          // Reset flag after scroll ends
          setTimeout(() => {
            isUserScrollingRef.current = false;
          }, 150);
        };

        viewport.addEventListener("scroll", handleScroll, { passive: true });

        cleanup = () => {
          viewport.removeEventListener("scroll", handleScroll);
        };
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(tryFindViewport, 50);
      }
    };

    tryFindViewport();

    return () => {
      cleanup?.();
    };
  }, []); // Only run once on mount

  // Auto-scroll to bottom when messages change, but only if user is near bottom
  useEffect(() => {
    // Don't auto-scroll if user is currently manually scrolling
    if (isUserScrollingRef.current) return;

    // Check if viewport is available for smart scroll detection
    const hasViewport = !!scrollViewportRef.current;

    if (hasViewport) {
      // Smart auto-scroll: only if user is near bottom
      const nearBottom = checkIfNearBottom();
      setIsNearBottom(nearBottom);

      // Only auto-scroll if user is near bottom (or if it's the first message)
      if (nearBottom || messages.length <= 1) {
        const timeoutId = setTimeout(() => {
          // Double-check user isn't scrolling before auto-scrolling
          if (!isUserScrollingRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);

        return () => clearTimeout(timeoutId);
      }
    } else {
      // Fallback: always auto-scroll if viewport detection failed
      // This ensures scrolling works even if viewport detection has issues
      const timeoutId = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || status === "streaming") return;

    console.log("[Playground] Sending message:", { text: inputValue });

    // Parameters are added via prepareSendMessagesRequest in transport
    await sendMessage({ text: inputValue });
    setInputValue("");
  };

  const handleReset = () => {
    window.location.reload();
  };

  const isLoading = status === "streaming";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-none border-b px-6 py-4">
        <h2 className="text-lg font-semibold">Playground</h2>
      </div>

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="grid min-h-0 w-full gap-6 px-6 py-4 md:grid-cols-[1fr_336px]">
          {/* Right Sidebar - Scrollable */}
          <div className="hidden min-h-0 flex-col gap-4 overflow-y-auto pr-2 sm:flex md:order-2">
            <ModelSelector models={models} value={selectedModel} onValueChange={setSelectedModel} />
            <TemperatureSelector value={temperature} onValueChange={setTemperature} />
            <MaxLengthSelector value={maxTokens} onValueChange={setMaxTokens} />
            <TopPSelector value={topP} onValueChange={setTopP} />

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="system-prompt" className="text-sm font-medium">
                System Prompt
              </Label>
              <ScrollArea className="h-[120px] rounded-md border">
                <Textarea
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="min-h-[120px] resize-none border-0 font-mono text-[10px] focus-visible:ring-0"
                  placeholder="System instructions..."
                />
              </ScrollArea>
            </div>

            <Separator />

            <ToolsConfig
              enabledTools={enabledTools}
              onToolToggle={(toolName, enabled) => {
                setEnabledTools((prev) => ({ ...prev, [toolName]: enabled }));
              }}
              vaults={vaults}
              selectedVaults={selectedVaults}
              onVaultsChange={setSelectedVaults}
            />
          </div>
          {/* Left Side - Chat Area with fixed input */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:order-1">
            {/* Messages - Scrollable */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4 p-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Bot className="text-muted-foreground mb-4 size-12" />
                      <h3 className="text-lg font-medium">AI Playground with Tools</h3>
                      <p className="text-muted-foreground mt-2 max-w-md text-sm">
                        Ask the AI to search vaults, run workflows, or process documents. The AI can use Case.dev tools
                        to complete your requests.
                      </p>
                      <div className="text-muted-foreground mt-4 space-y-1 text-xs">
                        <p>• "Search my vaults for references to post-operative care"</p>
                        <p>• "Get information about vault pe68vz9cjla500i2c7on9o6f"</p>
                        <p>• "Process the medical records with OCR"</p>
                      </div>
                    </div>
                  ) : (
                    messages
                      .filter((message) => {
                        // Filter out empty assistant messages
                        if (message.role === "assistant" && message.parts) {
                          const hasSubstance = message.parts.some((p: any) => {
                            // Has actual text (not just whitespace)
                            if (p.type === "text" && p.text?.trim()) return true;
                            // Has tool calls
                            if (p.type.startsWith("tool-")) return true;
                            return false;
                          });
                          return hasSubstance;
                        }
                        return true; // Keep all user messages
                      })
                      .map((message) => {
                        return (
                          <div
                            key={message.id}
                            className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                          >
                            {message.role === "assistant" && (
                              <div className="bg-primary/10 flex size-8 flex-shrink-0 items-center justify-center rounded-full">
                                <Bot className="text-primary size-4" />
                              </div>
                            )}

                            <div className={`max-w-[85%] space-y-2 ${message.role === "user" ? "ml-auto" : ""}`}>
                              {/* Render parts in chronological order (AI SDK sends them correctly) */}
                              {message.parts?.map((part: any, partIndex: number) => {
                                // Reasoning parts (from thinking models like CaseMark Core)
                                // Rendered in chronological order - appears before the answer
                                if (part.type === "reasoning") {
                                  // Calculate reasoning step number (1-based) based on previous reasoning parts
                                  const reasoningStep = message.parts
                                    .slice(0, partIndex + 1)
                                    .filter((p: any) => p.type === "reasoning").length;

                                  return (
                                    <Collapsible
                                      key={`${message.id}-reasoning-${partIndex}`}
                                      className="bg-muted/30 mb-2 rounded-md border"
                                      defaultOpen={partIndex === 0}
                                    >
                                      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 px-4 py-2 text-xs font-medium transition-colors [&[data-state=open]>svg]:rotate-90">
                                        <ChevronRight className="size-3.5 transition-transform duration-200" />
                                        <Brain className="size-3.5" />
                                        Reasoning (Step {reasoningStep})
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="px-4 pt-0 pb-4">
                                          <div className="text-muted-foreground pl-[22px] font-mono text-xs leading-relaxed whitespace-pre-wrap">
                                            {part.text}
                                          </div>
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  );
                                }

                                // Text parts - render with markdown support
                                if (part.type === "text") {
                                  return (
                                    <div
                                      key={`${message.id}-text-${partIndex}`}
                                      className={`rounded-lg p-4 ${
                                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                                      }`}
                                    >
                                      <Streamdown
                                        isAnimating={status === "streaming"}
                                        className={message.role === "user" ? "prose-invert" : ""}
                                      >
                                        {part.text}
                                      </Streamdown>
                                    </div>
                                  );
                                }

                                // Tool invocation parts
                                if (part.type.startsWith("tool-")) {
                                  return (
                                    <ToolInvocation
                                      key={`${message.id}-tool-${partIndex}`}
                                      toolName={part.type.replace("tool-", "")}
                                      args={part.input || part.args}
                                      result={part.output || part.result}
                                      isLoading={part.state === "input-streaming" || part.state === "call"}
                                    />
                                  );
                                }

                                return null;
                              })}

                              {/* Show empty state if no renderable parts */}
                              {message.parts &&
                                message.parts.length > 0 &&
                                message.role === "assistant" &&
                                !message.parts.some((p: any) => p.type === "text" || p.type.startsWith("tool-")) && (
                                  <div className="bg-muted rounded-lg p-4">
                                    <p className="text-muted-foreground text-xs">
                                      Streaming... ({message.parts[0]?.type})
                                    </p>
                                  </div>
                                )}
                            </div>

                            {message.role === "user" && (
                              <div className="bg-primary/10 flex size-8 flex-shrink-0 items-center justify-center rounded-full">
                                <User className="text-primary size-4" />
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Input Form - Fixed at bottom */}
            <form onSubmit={handleSubmit} className="flex flex-none flex-col gap-2 border-t p-4">
              <Textarea
                placeholder="Ask the AI to search vaults, run workflows, or analyze documents..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="min-h-[100px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={isLoading || !inputValue?.trim()}>
                    <Send className="mr-2 size-4" />
                    {isLoading ? "Generating..." : "Submit"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleReset}>
                    <RotateCcw className="mr-2 size-4" />
                    Reset
                  </Button>
                  {isLoading && (
                    <Button type="button" variant="outline" onClick={stop}>
                      Stop
                    </Button>
                  )}
                </div>
                <div className="text-muted-foreground text-xs">
                  {messages.length} message{messages.length !== 1 ? "s" : ""} • {status}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
