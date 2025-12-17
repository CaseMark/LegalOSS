import type { UIMessage } from "ai";
import { Loader2, Check, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ToolPartRendererProps } from "../types";

import { renderArtifactTool } from "./tools/artifact-tools";
import { renderSearchTool } from "./tools/search-tools";
import { renderVaultTool } from "./tools/vault-tools";

const renderers = [renderSearchTool, renderArtifactTool, renderVaultTool] as const;

// Fallback renderer for unknown tools
function FallbackToolPill({ part }: { part: any }) {
  const toolName = part?.type?.replace("tool-", "") || "Unknown tool";
  const state = part?.state;
  const isLoading = state === "input-available" || state === "input-streaming";

  // Format tool name nicely
  const displayName = toolName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str: string) => str.toUpperCase())
    .trim();

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm",
        isLoading ? "bg-muted/50 border-border animate-pulse" : "bg-card border-border",
      )}
    >
      <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-md">
        {isLoading ? (
          <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
        ) : (
          <Wrench className="text-muted-foreground h-3.5 w-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{displayName}</div>
        <div className="text-muted-foreground text-xs">{isLoading ? "Running..." : "Complete"}</div>
      </div>
      {!isLoading && <Check className="h-4 w-4 shrink-0 text-green-500" />}
    </div>
  );
}

export const ToolPart = ({
  part,
  context,
}: {
  part: UIMessage["parts"][number];
  context: ToolPartRendererProps["context"];
}) => {
  const anyPart = part as any;

  // Debug logging in development
  if (process.env.NODE_ENV !== "production") {
    const looksLikeTool =
      String(anyPart?.type || "").includes("tool") ||
      typeof anyPart?.toolName === "string" ||
      typeof anyPart?.tool_name === "string" ||
      typeof anyPart?.name === "string";
    if (looksLikeTool) {
      console.debug("[ui/tool-part]", {
        type: anyPart?.type,
        state: anyPart?.state,
        toolName: anyPart?.toolName || anyPart?.tool_name || anyPart?.name,
        keys: Object.keys(anyPart || {}),
      });
    }
  }

  for (const renderer of renderers) {
    const result = renderer({ part, context });
    if (result) return result;
  }

  // Fallback: render generic tool pill for unknown tool types
  if (String(anyPart?.type || "").startsWith("tool-")) {
    return (
      <div className="w-full min-w-0">
        <FallbackToolPill part={anyPart} />
      </div>
    );
  }

  return null;
};
