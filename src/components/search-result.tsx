"use client";

import { memo, useState, useEffect } from "react";

import { Gavel } from "@phosphor-icons/react";
import { Globe, ShieldCheck, FileText } from "lucide-react";

import { ToolCallPill } from "./ui/tool-call-pill";

export function WebSearchResult({
  result,
  isArtifactVisible = false,
}: {
  result: {
    sources?: Array<{ title?: string; url?: string; snippet?: string }>;
    query?: string;
  };
  isArtifactVisible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = Array.isArray(result?.sources) ? result.sources.length : 0;

  // Force close when artifact becomes visible to prevent overflow
  useEffect(() => {
    if (isArtifactVisible && open) {
      setOpen(false);
    }
  }, [isArtifactVisible, open]);

  return (
    <div className="w-full min-w-0">
      <ToolCallPill
        icon={Globe}
        title={`Found ${count} web source${count === 1 ? "" : "s"}`}
        subtitle={result?.query ? `"${result.query}"` : undefined}
        status="complete"
        tooltipText="View top web sources"
        onClick={() => !isArtifactVisible && setOpen((v) => !v)}
        showChevron={count > 0 && !isArtifactVisible}
        isOpen={open}
      />

      {open && count > 0 && !isArtifactVisible && (
        <div className="mt-2 space-y-2">
          {(result.sources || []).slice(0, 5).map((s, i) => (
            <div key={i} className="bg-background rounded border p-2">
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium underline underline-offset-2"
                >
                  {s.title || s.url}
                </a>
              ) : (
                <div className="text-sm font-medium">{s.title || "Source"}</div>
              )}
              {s.snippet && <div className="text-muted-foreground mt-1 line-clamp-3 text-sm">{s.snippet}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const MemoWebSearchResult = memo(WebSearchResult);

// CALL (in-progress) pill
export function WebSearchCallPill({ query }: { query?: string }) {
  return (
    <ToolCallPill
      icon={Globe}
      title="Searching the web"
      subtitle={query ? `"${query}"` : undefined}
      status="loading"
      tooltipText="Searching the web"
    />
  );
}

// Legal Find components
export function LegalFindCallPill({ query }: { query?: string }) {
  return (
    <ToolCallPill
      icon={Gavel as any}
      title="Searching case law"
      subtitle={query ? `"${query}"` : undefined}
      status="loading"
      tooltipText="Searching legal database"
    />
  );
}

export function LegalFindResult({
  result,
  isArtifactVisible = false,
}: {
  result: {
    query?: string;
    candidates?: Array<{
      url?: string;
      title?: string;
      snippet?: string;
      sourceHost?: string;
      type?: string;
    }>;
  };
  isArtifactVisible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = Array.isArray(result?.candidates) ? result.candidates.length : 0;

  useEffect(() => {
    if (isArtifactVisible && open) {
      setOpen(false);
    }
  }, [isArtifactVisible, open]);

  return (
    <div className="w-full min-w-0">
      <ToolCallPill
        icon={Gavel as any}
        title={`Found ${count} legal source${count === 1 ? "" : "s"}`}
        subtitle={result?.query ? `"${result.query}"` : undefined}
        status="complete"
        tooltipText="View legal sources"
        onClick={() => !isArtifactVisible && setOpen((v) => !v)}
        showChevron={count > 0 && !isArtifactVisible}
        isOpen={open}
      />

      {open && count > 0 && !isArtifactVisible && (
        <div className="mt-2 space-y-2">
          {(result.candidates || []).slice(0, 5).map((c, i) => (
            <div key={i} className="bg-background rounded border p-2">
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium underline underline-offset-2"
                >
                  {c.title || c.url}
                </a>
              ) : (
                <div className="text-sm font-medium">{c.title || "Source"}</div>
              )}
              {c.sourceHost && (
                <div className="text-muted-foreground mt-0.5 text-xs">
                  {c.sourceHost} • {c.type || "legal"}
                </div>
              )}
              {c.snippet && <div className="text-muted-foreground mt-1 line-clamp-2 text-sm">{c.snippet}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const MemoLegalFindResult = memo(LegalFindResult);

// Legal Verify components
export function LegalVerifyCallPill({ claim }: { claim?: string }) {
  return (
    <ToolCallPill
      icon={ShieldCheck}
      title="Verifying source"
      subtitle={claim}
      status="loading"
      tooltipText="Verifying legal source"
    />
  );
}

export function LegalVerifyResult({
  result,
}: {
  result: {
    verified?: boolean;
    verificationScore?: number;
    reasons?: string[];
    canonicalized?: { url?: string; citation?: string };
  };
}) {
  const verified = result?.verified ?? false;
  const score = result?.verificationScore ?? 0;

  return (
    <ToolCallPill
      icon={ShieldCheck}
      title={verified ? "Source verified" : "Verification failed"}
      subtitle={`Score: ${(score * 100).toFixed(0)}%`}
      status="complete"
      variant={verified ? "success" : "default"}
      tooltipText={result?.reasons?.join(", ") || "Verification complete"}
    />
  );
}

export const MemoLegalVerifyResult = memo(LegalVerifyResult);

// Document Search components
export function DocSearchCallPill({ query }: { query?: string }) {
  return (
    <ToolCallPill
      icon={FileText}
      title="Searching documents"
      subtitle={query ? `"${query}"` : undefined}
      status="loading"
      tooltipText="Searching uploaded documents"
    />
  );
}

export function DocSearchResult({
  result,
  isArtifactVisible = false,
}: {
  result: {
    success?: boolean;
    query?: string;
    results?: Array<{ text?: string; source?: string; score?: number }>;
    error?: string;
  };
  isArtifactVisible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = Array.isArray(result?.results) ? result.results.length : 0;

  // Debug logging
  if (process.env.NODE_ENV !== "production") {
    console.debug("[DocSearchResult]", {
      success: result?.success,
      count,
      query: result?.query,
      error: result?.error,
      hasResults: !!result?.results,
    });
  }

  useEffect(() => {
    if (isArtifactVisible && open) {
      setOpen(false);
    }
  }, [isArtifactVisible, open]);

  // Handle missing or invalid result
  if (!result) {
    return (
      <ToolCallPill
        icon={FileText}
        title="Document search"
        subtitle="Loading..."
        status="loading"
        tooltipText="Waiting for results"
      />
    );
  }

  if (!result.success) {
    return (
      <ToolCallPill
        icon={FileText}
        title="Document search failed"
        subtitle={result.error || "Unknown error"}
        status="complete"
        variant="default"
        tooltipText={result.error || "Search failed"}
      />
    );
  }

  return (
    <div className="w-full min-w-0">
      <ToolCallPill
        icon={FileText}
        title={`Found ${count} passage${count === 1 ? "" : "s"}`}
        subtitle={result?.query ? `"${result.query}"` : undefined}
        status="complete"
        tooltipText="View document excerpts"
        onClick={() => !isArtifactVisible && setOpen((v) => !v)}
        showChevron={count > 0 && !isArtifactVisible}
        isOpen={open}
      />

      {open && count > 0 && !isArtifactVisible && (
        <div className="mt-2 space-y-2">
          {(result.results || []).slice(0, 5).map((r, i) => (
            <div key={i} className="bg-background rounded border p-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{r.source || "Document"}</div>
                {r.score !== undefined && (
                  <div className="text-muted-foreground text-xs">{(r.score * 100).toFixed(0)}% match</div>
                )}
              </div>
              {r.text && <div className="text-muted-foreground mt-1 line-clamp-3 text-sm">{r.text}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const MemoDocSearchResult = memo(DocSearchResult);
