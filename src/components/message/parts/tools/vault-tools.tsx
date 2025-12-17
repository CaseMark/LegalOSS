"use client";

import { useState, useEffect, memo } from "react";

import { Database, FileText, Search, FolderOpen, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ToolPartRendererProps } from "../../types";

// Generic tool pill component
function VaultToolPill({
  icon: Icon,
  title,
  subtitle,
  status,
  onClick,
  isOpen,
  showChevron,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  status: "loading" | "complete";
  onClick?: () => void;
  isOpen?: boolean;
  showChevron?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
        status === "loading" ? "bg-muted/50 border-border animate-pulse" : "bg-card border-border hover:bg-accent/50",
        onClick && "cursor-pointer",
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md",
          status === "loading" ? "bg-primary/10" : "bg-primary/10",
        )}
      >
        {status === "loading" ? (
          <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icon className="text-primary h-3.5 w-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{title}</div>
        {subtitle && <div className="text-muted-foreground truncate text-xs">{subtitle}</div>}
      </div>
      {status === "complete" && !showChevron && <Check className="h-4 w-4 shrink-0 text-green-500" />}
      {showChevron &&
        (isOpen ? (
          <ChevronUp className="text-muted-foreground h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
        ))}
    </button>
  );
}

// getVault tool
function GetVaultResult({ result }: { result: any }) {
  return (
    <VaultToolPill
      icon={Database}
      title={result?.name || "Vault"}
      subtitle={result?.description || `${result?.objectCount || 0} files`}
      status="complete"
    />
  );
}

function GetVaultCallPill({ vaultId }: { vaultId?: string }) {
  return (
    <VaultToolPill
      icon={Database}
      title="Getting vault info"
      subtitle={vaultId ? `ID: ${vaultId.slice(0, 12)}...` : undefined}
      status="loading"
    />
  );
}

// listVaultObjects tool
function ListVaultObjectsResult({ result, isArtifactVisible }: { result: any; isArtifactVisible?: boolean }) {
  const [open, setOpen] = useState(false);
  const objects = result?.objects || [];
  const count = objects.length;

  useEffect(() => {
    if (isArtifactVisible && open) {
      setOpen(false);
    }
  }, [isArtifactVisible, open]);

  return (
    <div className="w-full min-w-0">
      <VaultToolPill
        icon={FolderOpen}
        title={`Found ${count} file${count === 1 ? "" : "s"}`}
        subtitle={result?.vaultName || undefined}
        status="complete"
        onClick={count > 0 && !isArtifactVisible ? () => setOpen(!open) : undefined}
        showChevron={count > 0 && !isArtifactVisible}
        isOpen={open}
      />

      {open && count > 0 && !isArtifactVisible && (
        <div className="mt-2 max-h-[200px] space-y-1.5 overflow-y-auto">
          {objects.slice(0, 10).map((obj: any, i: number) => (
            <div key={i} className="bg-background flex items-center gap-2 rounded border px-3 py-1.5 text-sm">
              <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{obj.filename || obj.name || "File"}</span>
              {obj.ingestionStatus && (
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-xs",
                    obj.ingestionStatus === "completed"
                      ? "bg-green-500/10 text-green-600"
                      : "bg-yellow-500/10 text-yellow-600",
                  )}
                >
                  {obj.ingestionStatus === "completed" ? "Indexed" : obj.ingestionStatus}
                </span>
              )}
            </div>
          ))}
          {count > 10 && <div className="text-muted-foreground py-1 text-center text-xs">+{count - 10} more files</div>}
        </div>
      )}
    </div>
  );
}

function ListVaultObjectsCallPill({ vaultId }: { vaultId?: string }) {
  return (
    <VaultToolPill
      icon={FolderOpen}
      title="Listing vault files"
      subtitle={vaultId ? `ID: ${vaultId.slice(0, 12)}...` : undefined}
      status="loading"
    />
  );
}

// searchVault tool
function SearchVaultResult({ result, isArtifactVisible }: { result: any; isArtifactVisible?: boolean }) {
  const [open, setOpen] = useState(false);
  const chunks = result?.chunks || result?.results || [];
  const count = chunks.length;

  useEffect(() => {
    if (isArtifactVisible && open) {
      setOpen(false);
    }
  }, [isArtifactVisible, open]);

  return (
    <div className="w-full min-w-0">
      <VaultToolPill
        icon={Search}
        title={`Found ${count} result${count === 1 ? "" : "s"}`}
        subtitle={result?.query ? `"${result.query}"` : undefined}
        status="complete"
        onClick={count > 0 && !isArtifactVisible ? () => setOpen(!open) : undefined}
        showChevron={count > 0 && !isArtifactVisible}
        isOpen={open}
      />

      {open && count > 0 && !isArtifactVisible && (
        <div className="mt-2 max-h-[300px] space-y-2 overflow-y-auto">
          {chunks.slice(0, 5).map((chunk: any, i: number) => (
            <div key={i} className="bg-background rounded border p-2">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex-1 truncate text-sm font-medium">
                  {chunk.filename || chunk.source || "Document"}
                </div>
                {chunk.score !== undefined && (
                  <div className="text-muted-foreground ml-2 shrink-0 text-xs">
                    {(chunk.score * 100).toFixed(0)}% match
                  </div>
                )}
              </div>
              {chunk.text && <div className="text-muted-foreground line-clamp-3 text-sm">{chunk.text}</div>}
            </div>
          ))}
          {count > 5 && <div className="text-muted-foreground py-1 text-center text-xs">+{count - 5} more results</div>}
        </div>
      )}
    </div>
  );
}

function SearchVaultCallPill({ query }: { query?: string }) {
  return (
    <VaultToolPill icon={Search} title="Searching vault" subtitle={query ? `"${query}"` : undefined} status="loading" />
  );
}

// listVaultFiles tool (from vault-filesystem)
function ListVaultFilesResult({ result, isArtifactVisible }: { result: any; isArtifactVisible?: boolean }) {
  const [open, setOpen] = useState(false);
  const files = result?.files || [];
  const count = files.length;

  useEffect(() => {
    if (isArtifactVisible && open) {
      setOpen(false);
    }
  }, [isArtifactVisible, open]);

  return (
    <div className="w-full min-w-0">
      <VaultToolPill
        icon={FolderOpen}
        title={`Found ${count} file${count === 1 ? "" : "s"}`}
        subtitle={`${result?.searchableFiles || 0} searchable`}
        status="complete"
        onClick={count > 0 && !isArtifactVisible ? () => setOpen(!open) : undefined}
        showChevron={count > 0 && !isArtifactVisible}
        isOpen={open}
      />

      {open && count > 0 && !isArtifactVisible && (
        <div className="mt-2 max-h-[200px] space-y-1.5 overflow-y-auto">
          {files.slice(0, 10).map((file: any, i: number) => (
            <div key={i} className="bg-background flex items-center gap-2 rounded border px-3 py-1.5 text-sm">
              <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{file.filename || "File"}</span>
              {file.isSearchable && <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />}
            </div>
          ))}
          {count > 10 && <div className="text-muted-foreground py-1 text-center text-xs">+{count - 10} more files</div>}
        </div>
      )}
    </div>
  );
}

function ListVaultFilesCallPill({ vaultId }: { vaultId?: string }) {
  return (
    <VaultToolPill
      icon={FolderOpen}
      title="Listing files"
      subtitle={vaultId ? `Vault: ${vaultId.slice(0, 8)}...` : "All vaults"}
      status="loading"
    />
  );
}

// Main renderer
export const renderVaultTool = ({ part, context }: ToolPartRendererProps) => {
  if (!part || typeof part !== "object") return null;

  const { type } = part as any;
  const { isArtifactVisible } = context;

  switch (type) {
    case "tool-getVault": {
      const { toolCallId, state, input, output } = part as any;
      if (state === "input-available" || state === "input-streaming") {
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <GetVaultCallPill vaultId={input?.vaultId} />
          </div>
        );
      }
      if (state === "output-available") {
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <GetVaultResult result={output} />
          </div>
        );
      }
      return null;
    }

    case "tool-listVaultObjects": {
      const { toolCallId, state, input, output } = part as any;
      if (state === "input-available" || state === "input-streaming") {
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <ListVaultObjectsCallPill vaultId={input?.vaultId} />
          </div>
        );
      }
      if (state === "output-available") {
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <ListVaultObjectsResult result={output} isArtifactVisible={isArtifactVisible} />
          </div>
        );
      }
      return null;
    }

    case "tool-searchVault": {
      const { toolCallId, state, input, output } = part as any;
      if (state === "input-available" || state === "input-streaming") {
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <SearchVaultCallPill query={input?.query} />
          </div>
        );
      }
      if (state === "output-available") {
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <SearchVaultResult result={output} isArtifactVisible={isArtifactVisible} />
          </div>
        );
      }
      return null;
    }

    case "tool-listVaultFiles": {
      const { toolCallId, state, input, output } = part as any;
      if (state === "input-available" || state === "input-streaming") {
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <ListVaultFilesCallPill vaultId={input?.vaultId} />
          </div>
        );
      }
      if (state === "output-available") {
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <ListVaultFilesResult result={output} isArtifactVisible={isArtifactVisible} />
          </div>
        );
      }
      return null;
    }

    default:
      return null;
  }
};

export const MemoGetVaultResult = memo(GetVaultResult);
export const MemoListVaultObjectsResult = memo(ListVaultObjectsResult);
export const MemoSearchVaultResult = memo(SearchVaultResult);
