"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ViewResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: any;
}

export function ViewResultDialog({ open, onOpenChange, result }: ViewResultDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  // Extract text content from result
  const getTextContent = () => {
    if (result.output?.format === "json" && result.output?.data) {
      // Convert JSON to readable markdown format
      return formatJsonAsMarkdown(result.output.data);
    } else if (typeof result.output?.data === 'string') {
      return result.output.data;
    } else if (result.output?.format === "pdf") {
      return `PDF Result\n\nThis workflow generated a PDF document.\nDownload URL: ${result.output.url || 'N/A'}`;
    }
    return "No text content available";
  };

  const formatJsonAsMarkdown = (data: any, level = 0): string => {
    if (typeof data !== 'object' || data === null) {
      return String(data);
    }

    if (Array.isArray(data)) {
      return data.map((item, i) => {
        if (typeof item === 'object') {
          return `${i + 1}. ${formatJsonAsMarkdown(item, level + 1)}`;
        }
        return `- ${item}`;
      }).join('\n');
    }

    const indent = '  '.repeat(level);
    return Object.entries(data)
      .map(([key, value]) => {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            return `${indent}**${formattedKey}:**\n${formatJsonAsMarkdown(value, level + 1)}`;
          }
          return `${indent}**${formattedKey}:**\n${formatJsonAsMarkdown(value, level + 1)}`;
        }
        return `${indent}**${formattedKey}:** ${value}`;
      })
      .join('\n\n');
  };

  const textContent = getTextContent();

  const handleCopy = async () => {
    try {
      // Strip markdown formatting for plain text copy
      const plainText = textContent
        .replace(/\*\*/g, '')  // Remove bold
        .replace(/^#+\s/gm, '') // Remove headers
        .replace(/^-\s/gm, '• '); // Convert - to bullets
      
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{result.document_name || "Result"}</DialogTitle>
              <DialogDescription className="truncate">
                {result.workflow_name}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={result.status === "completed" ? "outline" : "destructive"} className="shrink-0">
                {result.status}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 relative mt-4">
          <ScrollArea className="absolute inset-0">
            <div className="pr-4">
              {result.output?.format === "pdf" && result.output?.url ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <div className="p-4 bg-muted rounded-full">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">PDF Document Generated</p>
                    <a 
                      href={result.output.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Open PDF Document →
                    </a>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-muted/30 p-4 rounded-lg">
                    {textContent}
                  </pre>
                </div>
              )}

              {result.usage && (
                <div className="mt-6 pt-4 border-t text-xs text-muted-foreground flex justify-between">
                  <span>Duration: {(result.duration_ms ? result.duration_ms / 1000 : 0).toFixed(2)}s</span>
                  <span>Tokens: {result.usage.total_tokens?.toLocaleString()}</span>
                  <span>Cost: ${result.usage.cost?.toFixed(5)}</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}



