"use client";

import * as React from "react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface MaxLengthSelectorProps {
  value: number[];
  onValueChange: (value: number[]) => void;
}

export function MaxLengthSelector({ value, onValueChange }: MaxLengthSelectorProps) {
  return (
    <div className="grid gap-2 pt-2">
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxlength">Maximum Length</Label>
              <span className="text-muted-foreground hover:border-border w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm">
                {value[0]}
              </span>
            </div>
            <Slider
              id="maxlength"
              max={8192}
              value={value}
              step={256}
              onValueChange={onValueChange}
              min={256}
              aria-label="Maximum Length"
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-[260px] text-sm" side="left">
          The maximum number of tokens to generate. Requests can use up to 2,048 or 4,096 tokens, shared between prompt
          and completion. The exact limit varies by model.
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
