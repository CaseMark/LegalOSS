"use client";

import * as React from "react";

import { Check, ChevronsUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  models: any[];
  value: string;
  onValueChange: (value: string) => void;
}

export function ModelSelector({ models, value, onValueChange }: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const selectedModel = models.find((m: any) => m.id === value) || models[0];

  return (
    <div className="grid gap-3">
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <Label htmlFor="model">Model</Label>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-[260px] text-sm" side="left">
          Select from 130+ AI models including GPT-4, Claude, Gemini, and CaseMark Core.
        </HoverCardContent>
      </HoverCard>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select a model"
            className="w-full justify-between"
          >
            {selectedModel ? selectedModel.name || selectedModel.id : "Select a model..."}
            <ChevronsUpDown className="text-muted-foreground ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Search models..." />
            <CommandList>
              <CommandEmpty>No models found.</CommandEmpty>
              <CommandGroup>
                {models.map((model: any) => (
                  <CommandItem
                    key={model.id}
                    value={model.name || model.id}
                    onSelect={() => {
                      onValueChange(model.id);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start gap-1"
                  >
                    <div className="flex w-full items-center">
                      <span className="flex-1">{model.name || model.id}</span>
                      <Check className={cn("ml-auto size-4", value === model.id ? "opacity-100" : "opacity-0")} />
                    </div>
                    {model.tags && model.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {model.tags.slice(0, 3).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="px-1 py-0 text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
