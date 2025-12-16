"use client";

import { FileText, Check, Clock, AlertCircle, Loader2, Database, Hash, Calendar, HardDrive, FileType } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface FileDetails {
  id: string;
  filename: string;
  size: string;
  sizeBytes?: number;
  uploadedAt: string;
  status: string;
  contentType: string;
  chunkCount?: number | null;
  vectorCount?: number | null;
  pageCount?: number | null;
  textLength?: number | null;
  ingestionStatus?: string | null;
  ingestionCompletedAt?: string | null;
}

interface FileDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileDetails | null;
}

export function FileDetailsDialog({ open, onOpenChange, file }: FileDetailsDialogProps) {
  if (!file) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getIngestionStatusInfo = (status: string | null | undefined) => {
    const s = status?.toLowerCase() || "pending";
    switch (s) {
      case "completed":
        return { label: "Completed", icon: Check, variant: "default" as const, color: "text-green-600" };
      case "processing":
      case "ingesting":
        return { label: "Processing", icon: Loader2, variant: "secondary" as const, color: "text-blue-600", animate: true };
      case "failed":
      case "error":
        return { label: "Failed", icon: AlertCircle, variant: "destructive" as const, color: "text-red-600" };
      default:
        return { label: "Pending", icon: Clock, variant: "outline" as const, color: "text-muted-foreground" };
    }
  };

  const statusInfo = getIngestionStatusInfo(file.ingestionStatus);
  const StatusIcon = statusInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            File Details
          </DialogTitle>
          <DialogDescription className="break-all">{file.filename}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ingestion Status - Prominent */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${statusInfo.color} bg-background`}>
                  <StatusIcon className={`size-5 ${statusInfo.animate ? "animate-spin" : ""}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Indexing Status</p>
                  <p className="text-muted-foreground text-xs">
                    {statusInfo.label === "Completed"
                      ? "Document is searchable"
                      : statusInfo.label === "Processing"
                        ? "Being processed..."
                        : statusInfo.label === "Failed"
                          ? "Processing failed"
                          : "Not yet indexed"}
                  </p>
                </div>
              </div>
              <Badge variant={statusInfo.variant} className="capitalize">
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Processing Stats */}
          {(file.chunkCount || file.vectorCount || file.pageCount || file.textLength) && (
            <>
              <div>
                <h4 className="mb-3 text-sm font-medium">Processing Results</h4>
                <div className="grid grid-cols-2 gap-3">
                  {file.pageCount != null && (
                    <div className="bg-muted/30 rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="text-muted-foreground size-4" />
                        <span className="text-muted-foreground text-xs">Pages</span>
                      </div>
                      <p className="mt-1 text-lg font-semibold">{file.pageCount}</p>
                    </div>
                  )}
                  {file.chunkCount != null && (
                    <div className="bg-muted/30 rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <Hash className="text-muted-foreground size-4" />
                        <span className="text-muted-foreground text-xs">Chunks</span>
                      </div>
                      <p className="mt-1 text-lg font-semibold">{file.chunkCount}</p>
                    </div>
                  )}
                  {file.vectorCount != null && (
                    <div className="bg-muted/30 rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <Database className="text-muted-foreground size-4" />
                        <span className="text-muted-foreground text-xs">Vectors</span>
                      </div>
                      <p className="mt-1 text-lg font-semibold">{file.vectorCount}</p>
                    </div>
                  )}
                  {file.textLength != null && (
                    <div className="bg-muted/30 rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <FileType className="text-muted-foreground size-4" />
                        <span className="text-muted-foreground text-xs">Characters</span>
                      </div>
                      <p className="mt-1 text-lg font-semibold">{file.textLength.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* File Info */}
          <div>
            <h4 className="mb-3 text-sm font-medium">File Information</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <HardDrive className="size-4" />
                  <span className="text-sm">Size</span>
                </div>
                <span className="text-sm font-medium">{file.size}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileType className="size-4" />
                  <span className="text-sm">Type</span>
                </div>
                <span className="text-sm font-medium">{file.contentType}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4" />
                  <span className="text-sm">Uploaded</span>
                </div>
                <span className="text-sm font-medium">{formatDate(file.uploadedAt)}</span>
              </div>
              {file.ingestionCompletedAt && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="size-4" />
                    <span className="text-sm">Indexed</span>
                  </div>
                  <span className="text-sm font-medium">{formatDate(file.ingestionCompletedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Object ID */}
          <div className="border-t pt-4">
            <p className="text-muted-foreground text-xs">
              Object ID: <code className="bg-muted rounded px-1 py-0.5">{file.id}</code>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

