"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

import Link from "next/link";

import {
  MagnifyingGlass,
  Funnel,
  BookmarkSimple,
  Scales,
  Calendar,
  CaretDown,
  Lightning,
  CircleNotch,
  Clock,
  PaperPlaneTilt,
  Plus,
  LinkSimple,
  FileText,
  Trash,
  X,
  Sparkle,
  Brain,
  TextAlignLeft,
  Quotes,
  Globe,
  Gavel,
  Books,
  ArrowRight,
  Copy,
  Export,
  CheckCircle,
  Warning,
  Info,
  ChatCircle,
  Check,
  Folder,
} from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { ModelSelector } from "@/components/model-selector";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Separator } from "@/components/ui/separator";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Superscript digits for parsing
const SUPER_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

// Convert superscript string to number
function fromSuperscript(s: string): number {
  return parseInt(
    s
      .split("")
      .map((c) => {
        const idx = SUPER_DIGITS.indexOf(c);
        return idx >= 0 ? idx.toString() : "";
      })
      .join("") || "0",
  );
}

// Process text to make superscript citations clickable
function processCitations(text: string, sources: ResearchResult[]): React.ReactNode {
  // Split on superscript number sequences
  const parts = text.split(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g);

  return parts.map((part, i) => {
    // Check if this part is a superscript number
    if (/^[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/.test(part)) {
      const num = fromSuperscript(part);
      const source = sources[num - 1];
      if (source?.url) {
        return (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary cursor-pointer no-underline hover:underline"
            title={source.title}
          >
            <sup className="text-[0.75em] font-medium">{part}</sup>
          </a>
        );
      }
      return (
        <sup key={i} className="text-primary text-[0.75em]">
          {part}
        </sup>
      );
    }
    return part;
  });
}

// Component to render markdown with clickable inline citations
function CitedMarkdown({ content, sources }: { content: string; sources: ResearchResult[] }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {children}
          </a>
        ),
        p: ({ children }) => (
          <p>
            {Array.isArray(children)
              ? children.map((child, i) => (typeof child === "string" ? processCitations(child, sources) : child))
              : typeof children === "string"
                ? processCitations(children, sources)
                : children}
          </p>
        ),
        li: ({ children }) => (
          <li>
            {Array.isArray(children)
              ? children.map((child, i) => (typeof child === "string" ? processCitations(child, sources) : child))
              : typeof children === "string"
                ? processCitations(children, sources)
                : children}
          </li>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

interface ResearchResult {
  id: string;
  category: string;
  title: string;
  citation?: string;
  source: string;
  snippet: string;
  url?: string;
  date?: string;
  relevance: number;
  index?: number;
}

interface Source {
  id: string;
  type: "url" | "text" | "document";
  title: string;
  content: string;
  url?: string;
  addedAt: Date;
}

interface ResearchSession {
  query: string;
  status: "idle" | "planning" | "researching" | "analyzing" | "synthesizing" | "complete" | "error";
  statusMessage?: string;
  searchQueries?: string[];
  results: ResearchResult[];
  synthesis: string;
  sources: Source[];
  startedAt?: Date;
  completedAt?: Date;
  totalSources?: number;
  chatId?: string;
}

export function ResearchClient() {
  // Case selection removed - research works independently
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState("anthropic/claude-sonnet-4.5");
  const [session, setSession] = useState<ResearchSession>({
    query: "",
    status: "idle",
    results: [],
    synthesis: "",
    sources: [],
  });

  // Deduplicate results based on URL and similar titles
  const dedupedResults = useMemo(() => {
    const seen = new Map<string, ResearchResult>();

    for (const result of session.results) {
      // Normalize URL (remove trailing slashes, query params for dedup)
      const normalizedUrl = result.url ? result.url.split("?")[0].replace(/\/+$/, "").toLowerCase() : "";

      // Normalize title for comparison (lowercase, remove extra spaces)
      const normalizedTitle = result.title.toLowerCase().trim().replace(/\s+/g, " ");

      // Create a dedup key from URL or title
      const urlKey = normalizedUrl || "";
      const titleKey = normalizedTitle.slice(0, 60); // First 60 chars of title

      // Check for URL match first
      if (urlKey && seen.has(urlKey)) {
        continue; // Skip duplicate URL
      }

      // Check for very similar titles (same domain + similar title = likely dupe)
      const titleDomainKey = `${result.source}:${titleKey}`;
      if (seen.has(titleDomainKey)) {
        continue; // Skip duplicate title from same domain
      }

      // Add to seen
      if (urlKey) seen.set(urlKey, result);
      seen.set(titleDomainKey, result);
    }

    return Array.from(new Set(seen.values()));
  }, [session.results]);

  // Sources management
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [sourceType, setSourceType] = useState<"url" | "text" | "files">("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");

  // Matter files disabled - use URL sources instead
  const matterDocuments: Array<{ id: string; name: string; title?: string; status: string }> = [];
  const selectedMatterFiles = new Set<string>();
  const isLoadingDocs = false;

  const toggleMatterFile = (docId: string) => {
    // Disabled - no matter selection
  };

  const selectAllMatterFiles = () => {
    // Disabled - no matter selection
  };

  const deselectAllMatterFiles = () => {
    // Disabled - no matter selection
  };

  // Filters
  const [filters, setFilters] = useState({
    categories: [] as string[],
    dateRange: "all" as "all" | "1y" | "5y" | "10y",
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const synthesisRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll to synthesis when complete
  useEffect(() => {
    if (session.status === "complete" && synthesisRef.current) {
      synthesisRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [session.status]);

  const handleAddSource = () => {
    if (sourceType === "url" && !sourceUrl.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    if (sourceType === "text" && !sourceText.trim()) {
      toast.error("Please enter some text");
      return;
    }
    if (sourceType === "files" && selectedMatterFiles.size === 0) {
      toast.error("Please select at least one file");
      return;
    }

    if (sourceType === "files") {
      // Add all selected files as sources
      const newSources: Source[] = Array.from(selectedMatterFiles).map((docId) => {
        const doc = matterDocuments.find((d) => d.id === docId);
        return {
          id: crypto.randomUUID(),
          type: "document" as const,
          title: doc?.name || doc?.title || "Document",
          content: `[Matter Document: ${doc?.name || doc?.title}]`,
          addedAt: new Date(),
        };
      });

      setSession((prev) => ({
        ...prev,
        sources: [...prev.sources, ...newSources],
      }));

      // Note: matter files disabled in LegalOSS
      setShowAddSourceDialog(false);
      toast.success(`${newSources.length} file(s) added`);
      return;
    }

    const newSource: Source = {
      id: crypto.randomUUID(),
      type: sourceType,
      title: sourceTitle.trim() || (sourceType === "url" ? new URL(sourceUrl).hostname : "Text Source"),
      content: sourceType === "url" ? sourceUrl : sourceText,
      url: sourceType === "url" ? sourceUrl : undefined,
      addedAt: new Date(),
    };

    setSession((prev) => ({
      ...prev,
      sources: [...prev.sources, newSource],
    }));

    // Reset form
    setSourceUrl("");
    setSourceText("");
    setSourceTitle("");
    setShowAddSourceDialog(false);
    toast.success("Source added");
  };

  const handleRemoveSource = (id: string) => {
    setSession((prev) => ({
      ...prev,
      sources: prev.sources.filter((s) => s.id !== id),
    }));
  };

  const handleResearch = useCallback(async () => {
    if (!query.trim()) {
      toast.error("Please enter a research query");
      return;
    }

    setSession((prev) => ({
      ...prev,
      query: query.trim(),
      status: "researching",
      results: [],
      synthesis: "",
      startedAt: new Date(),
      completedAt: undefined,
    }));

    try {
      // Call the deep research API
      const response = await fetch("/api/research/deep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          model: selectedModel,
          sources: session.sources,
          filters,
        }),
      });

      if (!response.ok) {
        throw new Error("Research failed");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

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

              if (parsed.type === "status") {
                setSession((prev) => ({
                  ...prev,
                  status: parsed.status,
                  statusMessage: parsed.message,
                }));
              } else if (parsed.type === "queries") {
                setSession((prev) => ({
                  ...prev,
                  searchQueries: parsed.queries,
                }));
              } else if (parsed.type === "result") {
                setSession((prev) => ({
                  ...prev,
                  results: [...prev.results, parsed.result],
                }));
              } else if (parsed.type === "synthesis") {
                setSession((prev) => ({
                  ...prev,
                  synthesis: prev.synthesis + parsed.content,
                }));
              } else if (parsed.type === "complete") {
                setSession((prev) => ({
                  ...prev,
                  status: "complete",
                  completedAt: new Date(),
                  totalSources: parsed.totalSources,
                  chatId: parsed.chatId,
                }));
                if (parsed.chatId) {
                  toast.success("Research saved! You can find it in your chat history.");
                }
              } else if (parsed.type === "error") {
                setSession((prev) => ({
                  ...prev,
                  status: "error",
                  statusMessage: parsed.message,
                }));
                toast.error(parsed.message || "Research failed");
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error("Research error:", error);
      setSession((prev) => ({ ...prev, status: "error" }));
      toast.error("Research failed. Please try again.");
    }
  }, [query, selectedModel, session.sources, filters]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleResearch();
    }
  };

  const toggleFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(value)
        ? prev.categories.filter((v) => v !== value)
        : [...prev.categories, value],
    }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "case":
        return <Gavel className="h-4 w-4" />;
      case "statute":
        return <Books className="h-4 w-4" />;
      case "regulation":
        return <Scales className="h-4 w-4" />;
      case "secondary":
        return <FileText className="h-4 w-4" />;
      case "news":
        return <Globe className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "case":
        return "bg-blue-500";
      case "statute":
        return "bg-purple-500";
      case "regulation":
        return "bg-orange-500";
      case "secondary":
        return "bg-green-500";
      case "news":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const isResearching = ["planning", "researching", "analyzing", "synthesizing"].includes(session.status);

  return (
    <div className="bg-background flex h-full overflow-hidden">
      {/* Left Panel: Sources & Filters */}
      <aside className="border-sidebar-border bg-sidebar flex w-[280px] shrink-0 flex-col border-r">
        <div className="border-sidebar-border border-b p-4">
          <h1 className="text-sidebar-foreground flex items-center gap-2 text-lg font-semibold">
            <Brain className="text-primary h-5 w-5" weight="duotone" />
            Deep Research
          </h1>
          <p className="text-sidebar-foreground/60 mt-1 text-xs">AI-powered legal research & synthesis</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-4">
            {/* Sources Section */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sidebar-foreground flex items-center gap-2 text-sm font-medium">
                  <LinkSimple className="h-4 w-4" />
                  Sources
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sidebar-foreground hover:bg-sidebar-accent h-7 gap-1 text-xs"
                  onClick={() => setShowAddSourceDialog(true)}
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </div>

              {session.sources.length > 0 ? (
                <div className="space-y-2">
                  {session.sources.map((source) => (
                    <div
                      key={source.id}
                      className="group bg-sidebar-accent/50 border-sidebar-border flex items-start gap-2 rounded-lg border p-2 text-sm"
                    >
                      <div className="mt-0.5 shrink-0">
                        {source.type === "url" ? (
                          <Globe className="h-4 w-4 text-blue-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sidebar-foreground truncate font-medium">{source.title}</p>
                        {source.url && <p className="text-sidebar-foreground/60 truncate text-xs">{source.url}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={() => handleRemoveSource(source.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sidebar-foreground/60 border-sidebar-border rounded-lg border border-dashed py-3 text-center text-xs">
                  Add URLs, paste text, or link documents to include in your research context
                </p>
              )}
            </div>

            <div className="border-sidebar-border my-4 border-t" />

            {/* Filters */}
            <Accordion type="multiple" defaultValue={["categories"]} className="w-full">
              <AccordionItem value="categories" className="border-sidebar-border">
                <AccordionTrigger className="text-sidebar-foreground py-2 text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Funnel className="h-4 w-4" />
                    Source Types
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 py-2">
                    {[
                      { id: "case", label: "Court Opinions" },
                      { id: "statute", label: "Statutes & Laws" },
                      { id: "regulation", label: "Regulations" },
                      { id: "secondary", label: "Law Reviews & Commentary" },
                      { id: "news", label: "Legal News" },
                    ].map((cat) => (
                      <div key={cat.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cat-${cat.id}`}
                          checked={filters.categories.includes(cat.id)}
                          onCheckedChange={() => toggleFilter(cat.id)}
                        />
                        <label
                          htmlFor={`cat-${cat.id}`}
                          className="text-sidebar-foreground flex cursor-pointer items-center gap-2 text-sm"
                        >
                          {getCategoryIcon(cat.id)}
                          {cat.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="daterange" className="border-sidebar-border">
                <AccordionTrigger className="text-sidebar-foreground py-2 text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 py-2">
                    {[
                      { id: "all", label: "All Time" },
                      { id: "1y", label: "Past Year" },
                      { id: "5y", label: "Past 5 Years" },
                      { id: "10y", label: "Past 10 Years" },
                    ].map((range) => (
                      <div key={range.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`date-${range.id}`}
                          checked={filters.dateRange === range.id}
                          onCheckedChange={() =>
                            setFilters((prev) => ({
                              ...prev,
                              dateRange: range.id as typeof filters.dateRange,
                            }))
                          }
                        />
                        <label htmlFor={`date-${range.id}`} className="text-sidebar-foreground cursor-pointer text-sm">
                          {range.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="border-sidebar-border my-4 border-t" />

            {/* Recent Searches */}
            <div>
              <h3 className="text-sidebar-foreground mb-3 flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Recent Searches
              </h3>
              <p className="text-sidebar-foreground/60 py-2 text-xs">Your recent research queries will appear here</p>
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Results Area */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-4xl p-6">
            {session.status === "idle" && !session.synthesis && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
                  <Brain className="text-primary h-10 w-10" weight="duotone" />
                </div>
                <h2 className="mb-3 text-2xl font-semibold">Deep Legal Research</h2>
                <p className="text-muted-foreground mb-8 max-w-md">
                  Our AI agent will search court opinions, statutes, regulations, and legal commentary to provide a
                  comprehensive research synthesis.
                </p>

                <div className="grid w-full max-w-lg grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    "What are the elements of negligent misrepresentation?",
                    "Summary judgment standard in federal court",
                    "Delaware corporate fiduciary duties",
                    "Hearsay exceptions under FRE 803",
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      className="h-auto justify-start px-4 py-3 text-left"
                      onClick={() => setQuery(suggestion)}
                    >
                      <MagnifyingGlass className="mr-2 h-4 w-4 shrink-0" />
                      <span className="text-sm">{suggestion}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Research Progress */}
            {isResearching && (
              <div className="space-y-6">
                {/* Status Banner */}
                <div className="bg-primary/5 border-primary/20 flex items-center gap-3 rounded-lg border p-4">
                  <CircleNotch className="text-primary h-5 w-5 shrink-0 animate-spin" />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {session.status === "planning" && "Generating research strategy..."}
                      {session.status === "researching" && "Searching legal databases..."}
                      {session.status === "analyzing" && "Analyzing sources..."}
                      {session.status === "synthesizing" && "Writing comprehensive memo..."}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {session.statusMessage || "This may take a minute for comprehensive results"}
                    </p>
                  </div>
                </div>

                {/* Search Queries Generated */}
                {session.searchQueries && session.searchQueries.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <MagnifyingGlass className="text-primary h-4 w-4" />
                      Research Queries ({session.searchQueries.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {session.searchQueries.map((q, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {q.length > 50 ? q.slice(0, 50) + "..." : q}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show results as they come in */}
                {dedupedResults.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 font-medium">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Found {dedupedResults.length} unique sources
                    </h3>
                    <div className="grid max-h-[300px] gap-2 overflow-y-auto">
                      {dedupedResults.slice(0, 10).map((result) => (
                        <Card key={result.id} className="p-3">
                          <div className="flex items-start gap-3">
                            <Badge className={`${getCategoryColor(result.category)} shrink-0 text-xs text-white`}>
                              {result.category}
                            </Badge>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{result.title}</p>
                              <p className="text-muted-foreground truncate text-xs">{result.source}</p>
                            </div>
                            <span className="text-muted-foreground shrink-0 text-xs">{result.relevance}%</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                    {dedupedResults.length > 10 && (
                      <p className="text-muted-foreground text-center text-sm">
                        +{dedupedResults.length - 10} more sources being analyzed
                      </p>
                    )}
                  </div>
                )}

                {/* Streaming synthesis */}
                {session.synthesis && (
                  <div ref={synthesisRef} className="prose prose-sm dark:prose-invert max-w-none font-serif">
                    <CitedMarkdown content={session.synthesis} sources={dedupedResults} />
                  </div>
                )}
              </div>
            )}

            {/* Complete Results */}
            {session.status === "complete" && session.synthesis && (
              <div className="space-y-8">
                {/* Synthesis */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      <Sparkle className="text-primary h-5 w-5" weight="fill" />
                      Research Synthesis
                    </h2>
                    <div className="flex items-center gap-2">
                      {session.chatId && (
                        <Button variant="outline" size="sm" className="gap-1" asChild>
                          <Link href={`/chat/${session.chatId}`}>
                            <ChatCircle className="h-4 w-4" />
                            View in Chat
                          </Link>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="gap-1">
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Export className="h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  </div>
                  <Card>
                    <CardContent className="p-6">
                      <div ref={synthesisRef} className="prose prose-sm dark:prose-invert max-w-none font-serif">
                        <CitedMarkdown content={session.synthesis} sources={dedupedResults} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sources Used */}
                {dedupedResults.length > 0 && (
                  <div>
                    <Accordion type="single" collapsible defaultValue="sources">
                      <AccordionItem value="sources" className="border-none">
                        <AccordionTrigger className="mb-4 py-0 text-lg font-semibold hover:no-underline">
                          <span className="flex items-center gap-2">
                            <Books className="h-5 w-5" />
                            Sources used in the report ({dedupedResults.length})
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 gap-2">
                            {dedupedResults.map((result) => (
                              <a
                                key={result.id}
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-card hover:bg-accent/50 group flex items-center gap-2 rounded-lg border p-2 transition-colors"
                              >
                                <img
                                  src={`https://www.google.com/s2/favicons?domain=${result.source}&sz=32`}
                                  alt=""
                                  className="h-5 w-5 shrink-0 rounded"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="group-hover:text-primary truncate text-sm font-medium">
                                    {result.title}
                                  </p>
                                  <p className="text-muted-foreground truncate text-xs">{result.source}</p>
                                </div>
                              </a>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}

                {/* Research Metadata */}
                <div className="text-muted-foreground flex items-center justify-center gap-4 border-t py-4 text-xs">
                  <span>Query: &ldquo;{session.query}&rdquo;</span>
                  <span>•</span>
                  <span>Model: {selectedModel}</span>
                  <span>•</span>
                  <span>
                    Completed in{" "}
                    {session.completedAt && session.startedAt
                      ? Math.round((session.completedAt.getTime() - session.startedAt.getTime()) / 1000)
                      : 0}
                    s
                  </span>
                </div>
              </div>
            )}

            {/* Error State */}
            {session.status === "error" && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-destructive/10 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
                  <Warning className="text-destructive h-8 w-8" />
                </div>
                <h3 className="mb-2 text-lg font-medium">Research Failed</h3>
                <p className="text-muted-foreground mb-6">Something went wrong. Please try again.</p>
                <Button onClick={handleResearch} className="gap-2">
                  <Lightning className="h-4 w-4" />
                  Retry Research
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area - Fixed at bottom */}
        <div className="border-border bg-background/80 supports-[backdrop-filter]:bg-background/60 border-t px-6 py-4 backdrop-blur">
          <div className="mx-auto max-w-4xl">
            <InputGroup className="rounded-2xl">
              <InputGroupTextarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your legal research query... (e.g., 'What are the elements of breach of fiduciary duty in Delaware?')"
                rows={2}
                className="max-h-[150px] min-h-[60px]"
              />
              <InputGroupAddon align="block-end">
                <InputGroupButton
                  variant="outline"
                  className="gap-1 rounded-full"
                  size="sm"
                  onClick={() => setShowAddSourceDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Source
                </InputGroupButton>
                <ModelSelector value={selectedModel} onValueChange={setSelectedModel} />
                <Separator orientation="vertical" className="ml-auto !h-4" />
                <InputGroupButton
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={handleResearch}
                  disabled={isResearching || !query.trim()}
                >
                  {isResearching ? (
                    <>
                      <CircleNotch className="h-4 w-4 animate-spin" />
                      {session.status === "planning" && "Planning..."}
                      {session.status === "researching" && "Searching..."}
                      {session.status === "analyzing" && "Analyzing..."}
                      {session.status === "synthesizing" && "Writing..."}
                    </>
                  ) : (
                    <>
                      <Lightning className="h-4 w-4" weight="fill" />
                      Research
                    </>
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>

            {/* Source Pills */}
            {session.sources.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {session.sources.map((source) => (
                  <Badge key={source.id} variant="secondary" className="gap-1 pr-1">
                    {source.type === "url" ? <Globe className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                    {source.title}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-destructive/20 ml-1 h-4 w-4"
                      onClick={() => handleRemoveSource(source.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Source Dialog */}
      <Dialog open={showAddSourceDialog} onOpenChange={setShowAddSourceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkSimple className="text-primary h-5 w-5" />
              Add Source
            </DialogTitle>
            <DialogDescription>
              Add a URL, paste text, or link a document to include in your research context.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as "url" | "text" | "files")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="url" className="gap-2">
                <Globe className="h-4 w-4" />
                URL
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-2">
                <TextAlignLeft className="h-4 w-4" />
                Text
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-2">
                <Folder className="h-4 w-4" />
                Files
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">URL</label>
                <Input
                  placeholder="https://example.com/article"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Title (optional)</label>
                <Input
                  placeholder="Source title"
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="text" className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Source title"
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="Paste text content here..."
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  rows={6}
                />
              </div>
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              <div className="border-border text-muted-foreground bg-muted/30 rounded-lg border p-8 text-center">
                <Folder className="mx-auto mb-3 h-8 w-8 opacity-50" />
                <p>File sources are not yet available in LegalOSS.</p>
                <p className="mt-2 text-sm">Use URL or text sources instead.</p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSourceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSource} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
