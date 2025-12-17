"use client";

import { useState, useEffect, useMemo } from "react";

import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Model {
  id: string;
  name?: string;
  provider?: string;
  cost_per_million_input_tokens?: number;
  cost_per_million_output_tokens?: number;
  context_length?: number;
}

// Featured models shown at the top
const FEATURED_MODELS = [
  { id: "casemark/casemark-core-1.5", label: "CaseMark Core 1.5", provider: "CaseMark" },
  { id: "casemark/casemark-core-1", label: "CaseMark Core 1", provider: "CaseMark" },
  { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro Preview", provider: "Google" },
  { id: "openai/gpt-5.2", label: "GPT-5.2", provider: "OpenAI" },
  { id: "anthropic/claude-opus-4.5", label: "Claude Opus 4.5", provider: "Anthropic" },
  { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", provider: "Anthropic" },
];

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function ModelSelector({ value, onValueChange }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch("/api/llm/models");
        if (response.ok) {
          const data = await response.json();
          // Handle both array and { data: [...] } formats
          const modelList = Array.isArray(data) ? data : data.data || [];
          setModels(modelList);
        }
      } catch (err) {
        console.error("Failed to load models:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchModels();
  }, []);

  // Filter featured models based on search
  const filteredFeatured = useMemo(() => {
    if (!search.trim()) return FEATURED_MODELS;
    const q = search.toLowerCase();
    return FEATURED_MODELS.filter(
      (m) =>
        m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q),
    );
  }, [search]);

  // Filter all models based on search
  const filteredModels = useMemo(() => {
    const nonFeatured = models.filter((m) => !FEATURED_MODELS.some((f) => f.id === m.id));
    if (!search.trim()) return nonFeatured;
    const q = search.toLowerCase();
    return nonFeatured.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.provider?.toLowerCase().includes(q),
    );
  }, [models, search]);

  // Get display name for selected model
  const getDisplayName = (modelId: string) => {
    const featured = FEATURED_MODELS.find((m) => m.id === modelId);
    if (featured) return featured.label;
    const model = models.find((m) => m.id === modelId);
    return model?.name || modelId.split("/").pop() || modelId;
  };

  // Format cost for display
  const formatCost = (model: Model) => {
    if (!model.cost_per_million_input_tokens) return "";
    const cost = model.cost_per_million_input_tokens;
    if (cost < 1) return `$${cost.toFixed(2)}/M`;
    return `$${cost.toFixed(0)}/M`;
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 h-8 w-auto min-w-[140px] gap-1 rounded-md border-0 px-2 text-xs focus:ring-0 focus:ring-offset-0">
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <SelectValue placeholder="Select model">{getDisplayName(value)}</SelectValue>
        )}
      </SelectTrigger>
      <SelectContent align="start" className="w-[320px]">
        {/* Search input */}
        <div className="border-border border-b p-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-sm"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {filteredFeatured.length > 0 && (
            <SelectGroup>
              <SelectLabel>Featured Models</SelectLabel>
              {filteredFeatured.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex w-full items-center justify-between gap-4">
                    <span>{model.label}</span>
                    <span className="text-muted-foreground text-xs">{model.provider}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {filteredModels.length > 0 && (
            <>
              {filteredFeatured.length > 0 && <SelectSeparator />}
              <SelectGroup>
                <SelectLabel>All Models</SelectLabel>
                {filteredModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="truncate">{model.name || model.id}</span>
                      <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                        {model.provider && <span>{model.provider}</span>}
                        {formatCost(model) && <span>{formatCost(model)}</span>}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}

          {!isLoading && filteredFeatured.length === 0 && filteredModels.length === 0 && (
            <div className="text-muted-foreground py-4 text-center text-sm">No models found</div>
          )}

          {isLoading && (
            <div className="text-muted-foreground flex items-center justify-center py-4 text-sm">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading models...
            </div>
          )}
        </div>
      </SelectContent>
    </Select>
  );
}
