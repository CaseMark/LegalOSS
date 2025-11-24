"use client";

import { useState, useEffect } from "react";
import { Check, Search, Sparkles, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export interface Workflow {
  id: string;
  name: string;
  description: string;
  parent_category?: string;
  sub_category?: string;
  type?: string;
  stage?: string;
  version?: string;
  similarity_score?: number;
}

interface WorkflowSelectorProps {
  selectedWorkflow: Workflow | null;
  onWorkflowSelect: (workflow: Workflow) => void;
  onRunWorkflow: () => void;
  canRun: boolean;
  isRunning: boolean;
}

export function WorkflowSelector({ 
  selectedWorkflow, 
  onWorkflowSelect,
  onRunWorkflow,
  canRun,
  isRunning
}: WorkflowSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSemantic, setIsSemantic] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch initial list
  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/workflows");
      if (!res.ok) throw new Error("Failed to fetch workflows");
      const data = await res.json();
      console.log("Workflows API response:", data);
      console.log("First workflow:", data.data?.[0]);
      setWorkflows(data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load workflows");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      if (isSemantic) {
        // If semantic search is on but empty, maybe re-fetch list or do nothing?
        // Typically semantic search needs a query. If empty, fallback to list.
        fetchWorkflows();
        return;
      }
      // If not semantic, we just filter client side, so fetching fresh list is fine
      fetchWorkflows();
      return;
    }

    if (!isSemantic) {
      // Client-side filtering is handled in render, but if we want to reset to full list before filtering:
      if (workflows.length === 0) await fetchWorkflows();
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch("/api/workflows/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          limit: 20
        }),
      });
      
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setWorkflows(data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger search on enter or toggle
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // If not semantic, filter the currently loaded workflows
  const displayedWorkflows = isSemantic 
    ? workflows 
    : workflows.filter(w => 
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Select Workflow</CardTitle>
          <div className="flex items-center space-x-2">
            <Switch 
              id="semantic-mode" 
              checked={isSemantic}
              onCheckedChange={(checked) => {
                setIsSemantic(checked);
                // Optional: Trigger search immediately if there is a query
                if (checked && searchQuery) {
                  // We need to wait for state update or pass checked explicitly
                  // For simplicity, user hits enter or button
                } else if (!checked) {
                  // Switch back to list mode, maybe re-fetch if we were in search results
                  fetchWorkflows();
                }
              }}
            />
            <Label htmlFor="semantic-mode" className="text-xs flex items-center gap-1 cursor-pointer">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              Semantic
            </Label>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isSemantic ? "Describe what you want to do..." : "Search by name..."}
              className="pl-8 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          {isSemantic && (
            <Button 
              size="sm" 
              variant="secondary"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          )}
          <Button
            size="icon"
            className="h-9 w-9 bg-green-600 hover:bg-green-700 text-white shrink-0"
            onClick={onRunWorkflow}
            disabled={!canRun || isRunning}
            title="Run Workflow"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          <div className="p-4 pt-0 space-y-2">
            {isLoading || isSearching ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              displayedWorkflows.map((workflow) => {
                const isSelected = selectedWorkflow?.id === workflow.id;
                
                const handleClick = () => {
                  console.log("Workflow clicked:", workflow);
                  console.log("Workflow ID:", workflow?.id);
                  console.log("Full workflow object:", JSON.stringify(workflow));
                  onWorkflowSelect(workflow);
                };
                
                return (
                  <div
                    key={workflow.id}
                    onClick={handleClick}
                    className={cn(
                      "flex flex-col gap-2 p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 text-sm relative group",
                      isSelected ? "border-primary bg-accent" : "bg-card border-transparent shadow-sm"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium leading-none">{workflow.name}</h4>
                      {isSelected && (
                        <Badge variant="default" className="h-5 px-1.5 text-[10px]">Selected</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {workflow.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                        {workflow.type || "workflow"}
                      </Badge>
                      {workflow.similarity_score && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {Math.round(workflow.similarity_score * 100)}% Match
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {!isLoading && !isSearching && displayedWorkflows.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No workflows found
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

