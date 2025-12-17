"use client";

import { useState } from "react";

import { Search, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaultId: string;
}

interface SearchResult {
  objectId: string;
  filename: string;
  excerpt: string;
  score: number;
  chunkIndex: number;
}

type SearchMethod = "fast" | "hybrid";

export function SearchDialog({ open, onOpenChange, vaultId }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState<SearchMethod>("hybrid");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);

    try {
      const response = await fetch(`/api/vaults/${vaultId}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          method,
          topK: 10,
        }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();

      // Transform API results to our format
      // Handle both chunks array and results array for backward compatibility
      const rawResults = data.chunks || data.results || [];
      const searchResults: SearchResult[] = rawResults.map((result: any) => ({
        objectId: result.objectId || result.object_id,
        filename: result.filename || "Unknown file",
        excerpt: result.text || result.excerpt || "",
        score: result.score || result.distance || result.hybridScore || 0,
        chunkIndex: result.chunkIndex || result.chunk_index || 0,
      }));

      setResults(searchResults);
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Search failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Semantic Search</DialogTitle>
          <DialogDescription>Search across all documents in this vault using natural language</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., What are the key terms of the settlement agreement?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
              {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Search Method</Label>
            <RadioGroup value={method} onValueChange={(value) => setMethod(value as SearchMethod)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hybrid" id="hybrid" />
                <Label htmlFor="hybrid" className="cursor-pointer font-normal">
                  <span className="font-medium">Hybrid</span> - Best accuracy (semantic + keyword matching)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fast" id="fast" />
                <Label htmlFor="fast" className="cursor-pointer font-normal">
                  <span className="font-medium">Fast</span> - Pure semantic similarity (&lt; 500ms)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <ScrollArea className="-mx-6 flex-1 px-6">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="text-muted-foreground mb-4 size-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Searching through documents...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              <div className="text-muted-foreground text-sm">Found {results.length} relevant results</div>
              {results.map((result, index) => (
                <div
                  key={`${result.objectId}-${index}`}
                  className="bg-muted/50 hover:bg-muted cursor-pointer space-y-2 rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="text-muted-foreground size-4 flex-shrink-0" />
                      <span className="font-medium">{result.filename}</span>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0">
                      {Math.round(result.score * 100)}% match
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{result.excerpt}</p>
                  <div className="text-muted-foreground text-xs">Chunk {result.chunkIndex}</div>
                </div>
              ))}
            </div>
          ) : query && !isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="text-muted-foreground mb-4 size-12" />
              <h3 className="text-lg font-medium">No results found</h3>
              <p className="text-muted-foreground text-sm">Try rephrasing your query or using different keywords</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="text-muted-foreground mb-4 size-12" />
              <h3 className="text-lg font-medium">Semantic Search</h3>
              <p className="text-muted-foreground max-w-md text-center text-sm">
                Ask questions in natural language. The AI will search through all documents and find the most relevant
                passages.
              </p>
              <div className="text-muted-foreground mt-4 space-y-1 text-xs">
                <p>• "What are the key terms of the settlement?"</p>
                <p>• "Find all references to the plaintiff's injuries"</p>
                <p>• "Show me evidence related to the timeline"</p>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
