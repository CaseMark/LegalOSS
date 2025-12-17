"use client";

import { useState, useCallback, useEffect, useRef } from "react";

import dynamic from "next/dynamic";

import { X, Copy, Check, FileText, FilePdf, MicrosoftWordLogo, CaretDown, CircleNotch } from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useArtifact } from "@/lib/artifacts/context";

// Dynamic import for MDXEditor wrapper (client-side only)
const MarkdownEditor = dynamic(() => import("@/components/markdown-editor"), {
  ssr: false,
  loading: () => <div className="text-muted-foreground p-4">Loading editor...</div>,
});

export function ArtifactDrawer() {
  const { artifact, isOpen, closeArtifact, updateContent, notifyUserEdit } = useArtifact();
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isExporting, setIsExporting] = useState<"pdf" | "docx" | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const originalContentRef = useRef<string>("");

  // Track if drawer was previously open
  const wasOpenRef = useRef(false);

  // Reset to preview mode only when drawer OPENS (not on every content change)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // Drawer just opened
      setIsEditing(false);
      setShowDownloadMenu(false);
      setIsDirty(false);
      originalContentRef.current = artifact?.content || "";
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, artifact?.content]);

  // Track content changes
  const handleContentChange = useCallback(
    (newContent: string) => {
      updateContent(newContent, false); // Don't sanitize user edits
      if (newContent !== originalContentRef.current) {
        setIsDirty(true);
      }
    },
    [updateContent],
  );

  // Handle closing - save if dirty
  const handleClose = useCallback(() => {
    if (isDirty && artifact) {
      notifyUserEdit();
    }
    closeArtifact();
  }, [isDirty, artifact, notifyUserEdit, closeArtifact]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!artifact?.content) return;
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [artifact?.content]);

  const handleExport = useCallback(
    async (format: "pdf" | "docx") => {
      if (!artifact) return;

      setIsExporting(format);
      setShowDownloadMenu(false);

      try {
        const response = await fetch("/api/artifacts/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: artifact.content,
            outputFormat: format,
            title: artifact.title,
          }),
        });

        if (!response.ok) {
          throw new Error("Export failed");
        }

        // Get the blob and download it
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${artifact.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Export error:", error);
      } finally {
        setIsExporting(null);
      }
    },
    [artifact],
  );

  if (!isOpen || !artifact) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Drawer Panel */}
      <div className="bg-background animate-in slide-in-from-right relative ml-auto flex h-full w-full max-w-4xl flex-col shadow-2xl duration-300">
        {/* Header */}
        <header className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <FileText className="text-primary h-5 w-5" weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{artifact.title}</h2>
                <span className="bg-secondary inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium">
                  v{artifact.version}
                </span>
              </div>
              <p className="text-muted-foreground text-sm capitalize">
                {artifact.kind}
                {artifact.isStreaming && <span className="text-primary ml-2">● Generating...</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && isDirty && (
              <button
                onClick={() => {
                  notifyUserEdit();
                  setIsDirty(false);
                  setIsEditing(false);
                }}
                className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white transition hover:bg-green-700"
              >
                Save
              </button>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                isEditing ? "bg-secondary hover:bg-secondary/80" : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
            <button
              onClick={handleCopy}
              className="bg-secondary hover:bg-secondary/80 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>

            {/* Download Dropdown */}
            <div className="relative" ref={downloadMenuRef}>
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                disabled={isExporting !== null}
                className="bg-secondary hover:bg-secondary/80 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition disabled:opacity-50"
              >
                {isExporting ? <CircleNotch className="h-4 w-4 animate-spin" /> : <CaretDown className="h-4 w-4" />}
                {isExporting ? `Exporting ${isExporting.toUpperCase()}...` : "Download"}
              </button>

              {showDownloadMenu && (
                <div className="border-border bg-popover absolute top-full right-0 z-50 mt-1 w-48 rounded-lg border shadow-lg">
                  <button
                    onClick={() => handleExport("pdf")}
                    className="hover:bg-secondary flex w-full items-center gap-3 rounded-t-lg px-4 py-3 text-sm transition"
                  >
                    <FilePdf className="h-5 w-5 text-red-500" weight="duotone" />
                    <span>Download as PDF</span>
                  </button>
                  <button
                    onClick={() => handleExport("docx")}
                    className="hover:bg-secondary flex w-full items-center gap-3 rounded-b-lg px-4 py-3 text-sm transition"
                  >
                    <MicrosoftWordLogo className="h-5 w-5 text-blue-500" weight="duotone" />
                    <span>Download as Word</span>
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="hover:bg-secondary flex h-10 w-10 items-center justify-center rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {isEditing ? (
            <MarkdownEditor content={artifact.content} onChange={handleContentChange} />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {artifact.content || "_Artifact is being generated..._"}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
