"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";

import Link from "next/link";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Bot, User, Loader2, Plus, ArrowDown, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ChatHistory } from "@/components/chat-history";
import { ToolPart } from "@/components/message/parts/tool-part";
import { ModelSelector } from "@/components/model-selector";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { VaultSelector } from "@/components/vault-selector";
import { useArtifact } from "@/lib/artifacts/context";

/** Generate UUID helper */
function generateUUID(): string {
  return crypto.randomUUID();
}

// Extract text content from message parts
function getMessageContent(message: any): string {
  if (message.parts && Array.isArray(message.parts)) {
    const hasArtifact = message.parts.some((part: any) => part.type === "tool-create_artifact");
    if (hasArtifact) {
      return "";
    }

    return message.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("");
  }
  if (message.content) return message.content;
  return "";
}

// Extract reasoning content from message parts
function getReasoningContent(message: any): string | null {
  if (message.parts && Array.isArray(message.parts)) {
    const reasoningParts = message.parts
      .filter((part: any) => part.type === "reasoning" && part.text)
      .map((part: any) => part.text)
      .join("");
    return reasoningParts || null;
  }
  return null;
}

// Extract tool parts from message
function getToolParts(message: any): any[] {
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts.filter((part: any) => {
      const type = String(part.type || "");
      return type.startsWith("tool-");
    });
  }
  return [];
}

// Render a single part
const MessagePart = memo(function MessagePart({
  part,
  index,
  messageId,
  chatId,
  isStreaming,
}: {
  part: any;
  index: number;
  messageId: string;
  chatId: string;
  isStreaming: boolean;
}) {
  const type = String(part?.type || "");

  // Text part
  if (type === "text" && part.text) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
      </div>
    );
  }

  // Reasoning part
  if (type === "reasoning" && part.text) {
    return (
      <details className="mb-2 text-left" open={isStreaming}>
        <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 py-1 text-xs">
          {isStreaming && <Loader2 className="h-3 w-3 animate-spin" />}
          <span className="italic">Reasoning</span>
        </summary>
        <div className="bg-muted/30 text-muted-foreground border-border/30 mt-1 max-h-48 overflow-y-auto rounded-lg border p-3 text-xs">
          <pre className="font-mono whitespace-pre-wrap">{part.text}</pre>
        </div>
      </details>
    );
  }

  // Tool part
  if (type.startsWith("tool-")) {
    return (
      <div className="my-2">
        <ToolPart
          part={part}
          context={{
            chatId,
            isLoading: isStreaming,
            isArtifactVisible: false,
          }}
        />
      </div>
    );
  }

  return null;
});

// Memoized message component to prevent re-renders
const ChatMessage = memo(function ChatMessage({
  message,
  isStreaming,
  chatId,
}: {
  message: any;
  isStreaming: boolean;
  chatId: string;
}) {
  const parts = message.parts && Array.isArray(message.parts) ? message.parts : [];
  const content = getMessageContent(message);

  // Check if this is an artifact-only message (should hide text)
  const hasArtifact = parts.some((part: any) => part.type === "tool-create_artifact");

  // For user messages, just show content directly
  if (message.role === "user") {
    return (
      <div className="flex flex-row-reverse gap-4">
        <div className="bg-primary flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl">
          <User className="text-primary-foreground h-5 w-5" />
        </div>
        <div className="max-w-[80%] flex-1 text-right">
          <div className="bg-primary text-primary-foreground inline-block rounded-2xl px-4 py-3">
            <p className="whitespace-pre-wrap">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  // For assistant messages, render parts in order
  return (
    <div className="flex gap-4">
      <div className="bg-accent flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl">
        <Bot className="text-accent-foreground h-5 w-5" />
      </div>
      <div className="max-w-[80%] flex-1 space-y-2">
        {parts.length > 0 ? (
          parts.map((part: any, index: number) => {
            // Skip text parts if this is an artifact message
            if (hasArtifact && part.type === "text") return null;

            return (
              <MessagePart
                key={`${message.id}-part-${index}`}
                part={part}
                index={index}
                messageId={message.id}
                chatId={chatId}
                isStreaming={isStreaming}
              />
            );
          })
        ) : content ? (
          // Fallback for messages without parts array
          <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          // Loading state
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default function AgentChatPage() {
  // Chat ID
  const [chatId, setChatId] = useState(() => generateUUID());

  // Input state
  const [input, setInput] = useState("");

  // Model state
  const [selectedModel, setSelectedModel] = useState("anthropic/claude-sonnet-4.5");

  // Vault selection
  const [selectedVaults, setSelectedVaults] = useState<string[]>([]);
  const selectedVaultsRef = useRef<string[]>([]);
  useEffect(() => {
    selectedVaultsRef.current = selectedVaults;
  }, [selectedVaults]);

  // Chat persistence
  const [chatTitle, setChatTitle] = useState("New Chat");
  const chatSavedRef = useRef(false);

  // Artifact state
  const {
    openArtifact,
    updateContent,
    setStreaming,
    isOpen: artifactIsOpen,
    setChatId: setArtifactChatId,
    saveArtifact,
    applySearchReplace,
    reopenArtifact,
    setOnUserEdit,
  } = useArtifact();
  const artifactDocIdRef = useRef<string | null>(null);
  const artifactStreamingRef = useRef<boolean>(false);
  const appliedUpdatesRef = useRef<Set<string>>(new Set());
  const userArtifactEditsRef = useRef<Array<{ title: string; version: number; timestamp: number }>>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Autoscroll state
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const isNearBottomRef = useRef(true);
  const isLoadingRef = useRef(false);

  const checkIfNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 150;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  const handleScroll = useCallback(() => {
    const isNearBottom = checkIfNearBottom();
    isNearBottomRef.current = isNearBottom;

    if (isNearBottom && !autoScrollEnabled) {
      setAutoScrollEnabled(true);
    } else if (!isNearBottom && autoScrollEnabled && isLoadingRef.current) {
      setAutoScrollEnabled(false);
    }
  }, [checkIfNearBottom, autoScrollEnabled]);

  // Use ref to avoid stale closure
  const selectedModelRef = useRef(selectedModel);
  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  // Use AI SDK React's useChat
  const chatHook = useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ messages, id, body }) {
        return {
          body: {
            messages,
            ...body,
            model: selectedModelRef.current,
            selectedVaults: selectedVaultsRef.current,
          },
        };
      },
    }),
  });

  const { messages, setMessages, sendMessage, status, stop } = chatHook;

  // Save chat when first message is sent
  const saveChat = useCallback(
    async (title: string) => {
      if (chatSavedRef.current) return;
      try {
        await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: chatId, title }),
        });
        chatSavedRef.current = true;
        setChatTitle(title);
      } catch (err) {
        console.error("Failed to save chat:", err);
      }
    },
    [chatId],
  );

  // Save messages when they change
  useEffect(() => {
    if (messages.length === 0) return;

    // Save chat with title from first user message
    if (!chatSavedRef.current) {
      const firstUserMessage = messages.find((m) => m.role === "user");
      if (firstUserMessage) {
        const content = getMessageContent(firstUserMessage);
        const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
        saveChat(title);
      }
    }

    // Save messages to database (debounced in real app, simplified here)
    const saveMessages = async () => {
      if (!chatSavedRef.current) return;
      for (const msg of messages) {
        try {
          const msgAny = msg as any;
          await fetch(`/api/chats/${chatId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: msg.id,
              role: msg.role,
              content: JSON.stringify(msgAny.parts || msgAny.content || ""),
            }),
          });
        } catch (err) {
          // Ignore duplicate errors
        }
      }
    };

    // Only save when not streaming
    if (status !== "streaming") {
      saveMessages();
    }
  }, [messages, chatId, status, saveChat]);

  // Load chat from history
  const loadChat = useCallback(
    async (loadChatId: string) => {
      try {
        const response = await fetch(`/api/chats/${loadChatId}/messages`);
        if (response.ok) {
          const data = await response.json();
          const loadedMessages = data.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
            parts: typeof msg.content === "string" ? JSON.parse(msg.content) : msg.content,
          }));

          setChatId(loadChatId);
          setMessages(loadedMessages);
          chatSavedRef.current = true;

          // Get chat title
          const chatResponse = await fetch("/api/chats");
          if (chatResponse.ok) {
            const chats = await chatResponse.json();
            const chat = chats.find((c: any) => c.id === loadChatId);
            if (chat) setChatTitle(chat.title);
          }
        }
      } catch (err) {
        console.error("Failed to load chat:", err);
      }
    },
    [setMessages],
  );

  // Set chatId in artifact context
  useEffect(() => {
    setArtifactChatId(chatId);
  }, [chatId, setArtifactChatId]);

  // Set up callback for when user edits artifact
  useEffect(() => {
    setOnUserEdit((artifact, oldVersion, newVersion) => {
      userArtifactEditsRef.current.push({
        title: artifact.title,
        version: newVersion,
        timestamp: Date.now(),
      });
    });

    return () => setOnUserEdit(null);
  }, [setOnUserEdit]);

  // Handle artifact tools
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return;

    const parts = (lastMessage as any).parts || [];

    // Handle create_artifact tool
    for (const part of parts) {
      if (part.type === "tool-create_artifact" && part.state === "output-available" && part.output?.id) {
        const output = part.output;
        if (artifactDocIdRef.current !== output.id) {
          artifactDocIdRef.current = output.id;
          artifactStreamingRef.current = true;
          openArtifact({
            id: output.id,
            title: output.title,
            kind: output.kind,
            content: "",
          });
        }
      }

      // Handle update_artifact tool
      if (part.type === "tool-update_artifact" && part.state === "output-available" && part.output) {
        const toolCallId = part.toolCallId;
        const output = part.output;

        if (toolCallId && appliedUpdatesRef.current.has(toolCallId)) {
          continue;
        }

        if (toolCallId) {
          appliedUpdatesRef.current.add(toolCallId);
        }

        if (output.fullContent) {
          updateContent(output.fullContent);
        } else if (output.searchReplace?.length > 0) {
          applySearchReplace(output.searchReplace);
        }

        if (output.artifactId) {
          reopenArtifact(output.artifactId);
        }
      }
    }

    // Stream text to artifact during initial creation
    const hasCreateArtifact = parts.some((p: any) => p.type === "tool-create_artifact");

    if (artifactStreamingRef.current && hasCreateArtifact && artifactIsOpen) {
      const textParts = parts.filter((p: any) => p.type === "text");
      if (textParts.length > 0) {
        const fullText = textParts.map((p: any) => p.text).join("");
        updateContent(fullText);
      }
    }

    // Save artifact when streaming is done
    if (status !== "streaming" && artifactStreamingRef.current && artifactDocIdRef.current) {
      const idToSave = artifactDocIdRef.current;
      artifactStreamingRef.current = false;
      setStreaming(false);
      saveArtifact(idToSave);
    }
  }, [
    messages,
    status,
    openArtifact,
    updateContent,
    setStreaming,
    artifactIsOpen,
    applySearchReplace,
    reopenArtifact,
    saveArtifact,
  ]);

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // Auto-scroll
  useEffect(() => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScrollEnabled]);

  useEffect(() => {
    if (isLoading) {
      setAutoScrollEnabled(true);
    }
  }, [isLoading]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      sendMessage({ text: input.trim() });
      setInput("");
    },
    [input, isLoading, sendMessage],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setChatId(generateUUID());
    setChatTitle("New Chat");
    chatSavedRef.current = false;
    artifactDocIdRef.current = null;
    artifactStreamingRef.current = false;
    appliedUpdatesRef.current.clear();
  }, [setMessages]);

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex items-center gap-4 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{chatTitle}</h1>
          <p className="text-muted-foreground text-sm">AI-powered legal assistant with tools</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <VaultSelector value={selectedVaults} onValueChange={setSelectedVaults} />
          <ChatHistory currentChatId={chatId} onSelectChat={loadChat} onNewChat={handleNewChat} />
          <Button variant="outline" size="sm" onClick={handleNewChat}>
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 ? (
            <div className="py-20 text-center">
              <div className="bg-accent/20 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
                <Bot className="text-primary h-10 w-10" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold">Welcome to LegalOSS Agent</h2>
              <p className="text-muted-foreground mx-auto mb-4 max-w-md">
                Your AI-powered legal assistant. Search case law, draft documents, and research legal topics with ease.
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={isLoading && index === messages.length - 1}
                chatId={chatId}
              />
            ))
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {!autoScrollEnabled && isLoading && (
          <div className="pointer-events-none sticky bottom-4 flex justify-center">
            <Button
              size="sm"
              variant="secondary"
              className="pointer-events-auto gap-1.5 shadow-lg"
              onClick={() => {
                setAutoScrollEnabled(true);
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <ArrowDown className="h-4 w-4" />
              Resume scrolling
            </Button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-border bg-background/80 supports-[backdrop-filter]:bg-background/60 border-t px-4 py-4 backdrop-blur">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <InputGroup className="rounded-2xl">
            <InputGroupTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask, Search or Chat..."
              rows={2}
              className="max-h-[200px] min-h-[60px] text-sm leading-relaxed"
            />
            <InputGroupAddon align="block-end">
              <InputGroupButton variant="outline" className="rounded-full" size="icon-xs" aria-label="Add">
                <Plus className="h-4 w-4" />
              </InputGroupButton>
              <ModelSelector value={selectedModel} onValueChange={setSelectedModel} />
              <Link href="/dashboard/research" className="ml-auto">
                <InputGroupButton variant="ghost" size="sm" className="gap-1.5" title="Switch to Deep Research mode">
                  <Search className="h-4 w-4" />
                  <span className="text-xs">Deep Research</span>
                </InputGroupButton>
              </Link>
              <Separator orientation="vertical" className="!h-4" />
              <InputGroupButton
                variant="default"
                className="rounded-full"
                size="icon-xs"
                disabled={isLoading || !input.trim()}
                onClick={handleSubmit}
                aria-label="Send"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
        <p className="text-muted-foreground mt-3 text-center text-xs">
          LegalOSS can make mistakes. Review important information carefully.
        </p>
      </div>
    </div>
  );
}
