"use client";

import { useState } from "react";
import { Check, Search, FileText, Layers, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useVaultObjectsMulti, VaultObject } from "@/lib/hooks/use-vault-objects-multi";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DocumentSelectorProps {
  selectedVaultIds: string[];
  selectedDocumentIds: string[];
  onDocumentToggle: (docId: string, doc: VaultObject) => void;
  runMode: "combined" | "separate";
  onRunModeChange: (mode: "combined" | "separate") => void;
}

export function DocumentSelector({ 
  selectedVaultIds, 
  selectedDocumentIds, 
  onDocumentToggle,
  runMode,
  onRunModeChange
}: DocumentSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { objects, isLoading } = useVaultObjectsMulti(selectedVaultIds);

  const filteredObjects = objects.filter((obj: VaultObject) => 
    (obj.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedVaultIds.length === 0) {
    return (
      <Card className="h-full flex flex-col bg-muted/40 border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mb-3 opacity-20" />
          <p className="text-sm">Select a vault to view documents</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Documents</CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <ToggleGroup 
                type="single" 
                value={runMode} 
                onValueChange={(val) => {
                  if (val) onRunModeChange(val as "combined" | "separate");
                }}
                className="scale-75 origin-right"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="separate" aria-label="Run Separately">
                      <File className="h-4 w-4" />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>Run Separately</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="combined" aria-label="Run Combined">
                      <Layers className="h-4 w-4" />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>Run Combined</TooltipContent>
                </Tooltip>
              </ToggleGroup>
            </TooltipProvider>
            <Badge variant="secondary" className="text-xs">
              {selectedDocumentIds.length} selected
            </Badge>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-8 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 pt-0 space-y-2">
              {filteredObjects.map((obj: VaultObject) => {
                const isSelected = selectedDocumentIds.includes(obj.id);
                const isIngested = obj.ingestionStatus === "completed";
                const isDisabled = !isIngested;
                
                return (
                  <div
                    key={obj.id}
                    onClick={() => isIngested && onDocumentToggle(obj.id, obj)}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-md border transition-all text-sm",
                      isDisabled && "opacity-50 cursor-not-allowed",
                      !isDisabled && "cursor-pointer hover:bg-accent/50",
                      isSelected ? "border-primary bg-accent" : "bg-card border-transparent shadow-sm"
                    )}
                  >
                    <div
                      className={cn(
                        "h-4 w-4 rounded-sm border border-primary flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "bg-primary text-primary-foreground" : "transparent"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{obj.name || "Untitled Document"}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground truncate">
                          {obj.size ? (obj.size / 1024).toFixed(1) : "0"} KB • {obj.createdAt ? new Date(obj.createdAt).toLocaleDateString() : "Unknown Date"}
                        </p>
                        {!isIngested && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {obj.ingestionStatus || "pending"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredObjects.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {objects.length === 0 ? "No documents found in selected vaults" : "No matching documents"}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
