"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Settings2, Trash2, Copy, Check } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ChatPage() {
  const [selectedModel, setSelectedModel] = useState("casemark/casemark-core-1");
  const [systemMessage, setSystemMessage] = useState(
    "You are a legal AI assistant. Provide helpful, accurate information about legal topics.",
  );
  const [temperature, setTemperature] = useState([1]);
  const [maxTokens, setMaxTokens] = useState([4096]);
  const [topP, setTopP] = useState([1]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Array<{ role: string; content: string; id: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: modelsData } = useSWR("/api/llm/models", fetcher);
  const models = modelsData?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input, id: Date.now().toString() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Build messages array with system message if set
      const apiMessages = systemMessage ? [{ role: "system", content: systemMessage }, ...newMessages] : newMessages;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
          temperature: temperature[0],
          max_tokens: maxTokens[0],
          top_p: topP[0],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      const assistantId = Date.now().toString();

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                assistantMessage += content;
                setMessages([...newMessages, { role: "assistant", content: assistantMessage, id: assistantId }]);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      toast.error("Failed to send message", {
        description: error instanceof Error ? error.message : "Please try again",
      });
      setMessages(newMessages.slice(0, -1)); // Remove user message on error
    } finally {
      setIsLoading(false);
    }
  };

  // Add system message to display if set
  const displayMessages = systemMessage
    ? [{ role: "system", content: systemMessage, id: "system" }, ...messages]
    : messages;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleClear = () => {
    if (confirm("Clear all messages?")) {
      setMessages([]);
    }
  };

  const copyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("Copied to clipboard");
  };

  const selectedModelInfo = models.find((m: any) => m.id === selectedModel);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">AI Chat</h1>
          <p className="text-muted-foreground text-sm">Chat with 40+ AI models - OpenAI, Anthropic, Google, and more</p>
        </div>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="mr-2 size-4" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[500px] overflow-y-auto sm:w-[600px]">
              <div className="px-6 py-6">
                <SheetHeader className="mb-8">
                  <SheetTitle className="text-foreground text-xl">Configuration</SheetTitle>
                  <SheetDescription className="text-muted-foreground mt-2">
                    Adjust model parameters and behavior
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-8">
                  {/* Model Selection */}
                  <div className="space-y-3">
                    <Label className="text-foreground text-sm font-medium">Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model: any) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex flex-col gap-0.5">
                              <span>{model.name || model.id}</span>
                              {model.pricing && (
                                <span className="text-muted-foreground text-xs">
                                  ${(parseFloat(model.pricing.input) * 1000000).toFixed(2)}/1M tokens
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedModelInfo && (
                      <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
                        {/* Tags */}
                        {selectedModelInfo.tags && selectedModelInfo.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedModelInfo.tags.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Context Window */}
                        <div className="space-y-1 text-xs">
                          <p className="text-muted-foreground">
                            <span className="text-foreground font-medium">Context:</span>{" "}
                            {selectedModelInfo.context_window?.toLocaleString()} tokens
                          </p>

                          {/* Pricing */}
                          {selectedModelInfo.pricing && (
                            <>
                              <p className="text-muted-foreground">
                                <span className="text-foreground font-medium">Input:</span> $
                                {(parseFloat(selectedModelInfo.pricing.input) * 1000000).toFixed(2)}/1M tokens
                              </p>
                              <p className="text-muted-foreground">
                                <span className="text-foreground font-medium">Output:</span> $
                                {(parseFloat(selectedModelInfo.pricing.output) * 1000000).toFixed(2)}/1M tokens
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator className="my-6" />

                  {/* System Message */}
                  <div className="space-y-3">
                    <Label className="text-foreground text-sm font-medium">System Message</Label>
                    <Textarea
                      value={systemMessage}
                      onChange={(e) => setSystemMessage(e.target.value)}
                      placeholder="Set model behavior and context..."
                      className="text-foreground min-h-[120px] resize-none"
                    />
                    <p className="text-muted-foreground text-xs">Define the AI's role and behavior</p>
                  </div>

                  <Separator className="my-6" />

                  {/* Temperature */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-foreground text-sm font-medium">Temperature</Label>
                      <span className="text-muted-foreground font-mono text-sm">{temperature[0].toFixed(1)}</span>
                    </div>
                    <Slider value={temperature} onValueChange={setTemperature} max={2} step={0.1} />
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Higher = more creative, lower = more focused
                    </p>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-foreground text-sm font-medium">Max Tokens</Label>
                      <span className="text-muted-foreground font-mono text-sm">{maxTokens[0]}</span>
                    </div>
                    <Slider value={maxTokens} onValueChange={setMaxTokens} min={256} max={8192} step={256} />
                    <p className="text-muted-foreground text-xs leading-relaxed">Maximum response length</p>
                  </div>

                  {/* Top P */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-foreground text-sm font-medium">Top P</Label>
                      <span className="text-muted-foreground font-mono text-sm">{topP[0].toFixed(2)}</span>
                    </div>
                    <Slider value={topP} onValueChange={setTopP} max={1} step={0.05} />
                    <p className="text-muted-foreground text-xs leading-relaxed">Nucleus sampling threshold</p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button variant="outline" size="sm" onClick={handleClear} disabled={messages.length === 0}>
            <Trash2 className="mr-2 size-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="mx-auto max-w-3xl space-y-4">
            {displayMessages.length === 0 ? (
              <Card className="mt-8">
                <CardHeader className="text-center">
                  <Bot className="text-muted-foreground mx-auto mb-4 size-12" />
                  <CardTitle className="text-foreground">Legal AI Assistant</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Ask questions about legal topics, analyze documents, or get help with case research. All responses
                    are powered by state-of-the-art AI models.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Card
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setInput("Explain the burden of proof in civil vs criminal cases");
                        setTimeout(() => {
                          const form = document.querySelector("form");
                          form?.requestSubmit();
                        }, 100);
                      }}
                    >
                      <CardContent className="pt-4">
                        <p className="text-foreground text-sm">
                          Explain the burden of proof in civil vs criminal cases
                        </p>
                      </CardContent>
                    </Card>
                    <Card
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setInput("What are the key elements of medical malpractice?");
                        setTimeout(() => {
                          const form = document.querySelector("form");
                          form?.requestSubmit();
                        }, 100);
                      }}
                    >
                      <CardContent className="pt-4">
                        <p className="text-foreground text-sm">What are the key elements of medical malpractice?</p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {displayMessages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                  >
                    {message.role !== "user" && message.role !== "system" && (
                      <div className="bg-primary/10 flex size-8 flex-shrink-0 items-center justify-center rounded-full">
                        <Bot className="text-primary size-4" />
                      </div>
                    )}

                    <div className={`max-w-[80%] flex-1 space-y-2`}>
                      {message.role === "system" ? (
                        <div className="bg-muted/50 rounded-lg border-l-4 border-blue-500 p-3">
                          <p className="text-muted-foreground mb-1 text-xs font-medium">SYSTEM</p>
                          <p className="text-foreground text-sm">{message.content}</p>
                        </div>
                      ) : (
                        <div
                          className={`group relative rounded-lg p-4 ${
                            message.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
                          }`}
                        >
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <p
                              className={`text-sm leading-relaxed whitespace-pre-wrap ${
                                message.role === "user" ? "text-primary-foreground" : "text-foreground"
                              }`}
                            >
                              {message.content}
                            </p>
                          </div>

                          {message.role !== "user" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 size-6 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => copyMessage(message.content, index)}
                            >
                              {copiedIndex === index ? <Check className="size-3" /> : <Copy className="size-3" />}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="bg-primary/10 flex size-8 flex-shrink-0 items-center justify-center rounded-full">
                        <User className="text-primary size-4" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              disabled={isLoading}
              className="text-foreground flex-1"
              autoFocus
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <div className="text-muted-foreground">
              Model: <span className="text-foreground font-medium">{selectedModelInfo?.name || selectedModel}</span>
            </div>
            <div className="text-muted-foreground">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
