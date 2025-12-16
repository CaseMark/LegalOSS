"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles, BookOpen, Send, ExternalLink, Clock, Loader2, Copy, Check } from "lucide-react";
import useSWR from "swr";
import { Streamdown } from "streamdown";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type SearchMode = "search" | "answer" | "research";

interface SearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
}

interface ResearchStatus {
  researchId: string;
  status: "pending" | "running" | "completed" | "failed" | "canceled";
  output?: { content: string };
  costDollars?: { total: number; numPages: number; numSearches: number };
}

// Research depth options
const RESEARCH_MODELS = [
  { value: "exa-research-fast", label: "Fast", description: "Quick results, less comprehensive" },
  { value: "exa-research", label: "Standard", description: "Balanced depth and speed (recommended)" },
  { value: "exa-research-pro", label: "Pro", description: "Most comprehensive, takes longer" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("search");
  const [selectedModel, setSelectedModel] = useState("casemark/casemark-core-1.5");
  const [researchModel, setResearchModel] = useState("exa-research");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Results state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [answerContent, setAnswerContent] = useState<string>("");
  const [researchStatus, setResearchStatus] = useState<ResearchStatus | null>(null);

  const { data: modelsData } = useSWR("/api/llm/models", fetcher);
  const models = modelsData?.data || [];

  // Poll for research status when in progress
  useEffect(() => {
    if (!researchStatus || !["pending", "running"].includes(researchStatus.status)) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/search/research/${researchStatus.researchId}`);
        const data = await res.json();
        setResearchStatus(data);
        if (data.status === "completed" || data.status === "failed" || data.status === "canceled") {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to poll research status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [researchStatus]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearchResults([]);
    setAnswerContent("");
    setResearchStatus(null);

    try {
      if (mode === "search") {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, numResults: 10, type: "auto" }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setSearchResults(data.results || []);
      } else if (mode === "answer") {
        const res = await fetch("/api/search/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, model: selectedModel, numResults: 10 }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setAnswerContent(data.answer || data.content || JSON.stringify(data, null, 2));
      } else if (mode === "research") {
        const res = await fetch("/api/search/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instructions: query, model: researchModel }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResearchStatus(data);
        return; // Don't set loading to false - polling will handle it
      }
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || "Search failed");
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    const content = mode === "answer" ? answerContent : researchStatus?.output?.content || "";
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasResults = searchResults.length > 0 || answerContent || researchStatus;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Web Search</h2>
            <p className="text-muted-foreground text-sm">AI-powered search, answers, and deep research</p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="size-3" />
            Powered by Case.dev
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="grid min-h-0 w-full gap-0 md:grid-cols-[400px_1fr]">
          {/* Left Panel - Search Controls */}
          <div className="flex flex-col border-r bg-muted/30">
            <div className="flex-none p-6 space-y-6">
              {/* Search Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Query</label>
                <InputGroup className="h-auto">
                  <InputGroupAddon align="inline-start">
                    <Search className="size-4 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    placeholder="Enter your search query..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    className="h-10"
                  />
                </InputGroup>
              </div>

              {/* Mode Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Mode</label>
                <Select value={mode} onValueChange={(v) => setMode(v as SearchMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="search">
                      <div className="flex items-center gap-2">
                        <Search className="size-4" />
                        <div className="text-left">
                          <div className="font-medium">Search</div>
                          <div className="text-xs text-muted-foreground">Find relevant web results</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="answer">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4" />
                        <div className="text-left">
                          <div className="font-medium">Answer</div>
                          <div className="text-xs text-muted-foreground">AI-generated answer from search</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="research">
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-4" />
                        <div className="text-left">
                          <div className="font-medium">Deep Research</div>
                          <div className="text-xs text-muted-foreground">Comprehensive research report</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Model Selector - For answer mode (LLM models) */}
              {mode === "answer" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model</label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {models.length > 0 ? (
                        models.map((model: any) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name || model.id}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="casemark/casemark-core-1.5">CaseMark Core 1.5</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Research Depth Selector */}
              {mode === "research" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Research Depth</label>
                  <Select value={researchModel} onValueChange={setResearchModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESEARCH_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div>
                            <div className="font-medium">{model.label}</div>
                            <div className="text-xs text-muted-foreground">{model.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Search Button */}
              <Button 
                onClick={handleSearch} 
                disabled={isLoading || !query.trim()} 
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {mode === "research" ? "Researching..." : "Searching..."}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 size-4" />
                    {mode === "search" ? "Search" : mode === "answer" ? "Get Answer" : "Start Research"}
                  </>
                )}
              </Button>

              {/* Error Display */}
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>

            <Separator />

            {/* Search Results List (for search mode) */}
            {mode === "search" && searchResults.length > 0 && (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    {searchResults.length} results found
                  </div>
                  {searchResults.map((result, index) => (
                    <a
                      key={result.id || index}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm line-clamp-2">{result.title}</h3>
                        <ExternalLink className="size-3.5 flex-shrink-0 text-muted-foreground" />
                      </div>
                      {result.publishedDate && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {new Date(result.publishedDate).toLocaleDateString()}
                        </div>
                      )}
                      {result.text && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                          {result.text}
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Right Panel - Artifact Output */}
          <div className="flex flex-col min-h-0 overflow-hidden bg-background">
            {hasResults ? (
              <>
                {/* Artifact Header */}
                <div className="flex-none flex items-center justify-between border-b px-6 py-3">
                  <div className="flex items-center gap-2">
                    {mode === "search" && <Search className="size-4 text-muted-foreground" />}
                    {mode === "answer" && <Sparkles className="size-4 text-primary" />}
                    {mode === "research" && <BookOpen className="size-4 text-primary" />}
                    <span className="font-medium">
                      {mode === "search" ? "Search Results" : mode === "answer" ? "AI Answer" : "Research Report"}
                    </span>
                    {researchStatus && (
                      <Badge variant={researchStatus.status === "completed" ? "default" : "secondary"}>
                        {researchStatus.status}
                      </Badge>
                    )}
                  </div>
                  {(mode === "answer" || mode === "research") && (answerContent || researchStatus?.output?.content) && (
                    <Button variant="ghost" size="sm" onClick={handleCopy}>
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  )}
                </div>

                {/* Artifact Content */}
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-6 pb-12">
                    {mode === "search" && searchResults.length > 0 && (
                      <div className="space-y-6">
                        {searchResults.map((result, index) => (
                          <div key={result.id || index} className="space-y-2">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-center gap-2 text-primary hover:underline"
                            >
                              <h3 className="font-semibold">{result.title}</h3>
                              <ExternalLink className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                            <p className="text-sm text-muted-foreground">{result.url}</p>
                            {result.text && (
                              <p className="text-sm">{result.text}</p>
                            )}
                            {index < searchResults.length - 1 && <Separator className="mt-4" />}
                          </div>
                        ))}
                      </div>
                    )}

                    {mode === "answer" && answerContent && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown>{answerContent}</Streamdown>
                      </div>
                    )}

                    {mode === "research" && researchStatus && (
                      <div className="space-y-4">
                        {researchStatus.status === "running" || researchStatus.status === "pending" ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Loader2 className="size-8 animate-spin text-primary mb-4" />
                            <h3 className="font-medium">Research in Progress</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Deep research takes 1-3 minutes to complete...
                            </p>
                          </div>
                        ) : researchStatus.output?.content ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <Streamdown>{researchStatus.output.content}</Streamdown>
                          </div>
                        ) : researchStatus.status === "failed" ? (
                          <div className="text-center py-12 text-destructive">
                            Research failed. Please try again.
                          </div>
                        ) : null}
                        
                        {researchStatus.costDollars && researchStatus.status === "completed" && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-4 mt-6">
                            <span>Pages analyzed: {researchStatus.costDollars.numPages}</span>
                            <span>Searches: {researchStatus.costDollars.numSearches}</span>
                            <span>Cost: ${researchStatus.costDollars.total.toFixed(4)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              /* Empty State */
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Search className="size-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Ready to Search</h3>
                <p className="text-muted-foreground mt-2 max-w-md text-sm">
                  Enter a query and choose your search mode. Results will appear here.
                </p>
                <div className="mt-6 grid gap-3 text-left text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Search className="size-4" />
                    <span><strong>Search</strong> - Fast web results</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Sparkles className="size-4" />
                    <span><strong>Answer</strong> - AI synthesizes results</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <BookOpen className="size-4" />
                    <span><strong>Research</strong> - Deep analysis report</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

