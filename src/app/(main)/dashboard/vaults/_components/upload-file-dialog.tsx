"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaultId: string;
}

interface FileUpload {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

export function UploadFileDialog({ open, onOpenChange, vaultId }: UploadFileDialogProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileUpload[] = Array.from(selectedFiles).map((file) => ({
      file,
      progress: 0,
      status: "pending",
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    // Process files in FIFO order (one at a time)
    const queue = files.filter((f) => f.status === "pending");

    for (const fileUpload of queue) {
      try {
        // Mark as uploading
        setFiles((prev) =>
          prev.map((f) => (f === fileUpload ? { ...f, status: "uploading" as const, progress: 0 } : f)),
        );

        const file = fileUpload.file;
        console.log(`[FIFO Queue] Processing: ${file.name} (${file.size} bytes)`);

        // Upload via backend proxy (avoids CORS issues)
        const formData = new FormData();
        formData.append("file", file);

        // Simulate progress (actual upload happens server-side)
        const uploadInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) => {
              if (f === fileUpload && f.progress < 90) {
                return { ...f, progress: f.progress + 10 };
              }
              return f;
            }),
          );
        }, 200);

        const uploadResponse = await fetch(`/api/vaults/${vaultId}/upload-file`, {
          method: "POST",
          body: formData,
        });

        clearInterval(uploadInterval);

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || "Upload failed");
        }

        const result = await uploadResponse.json();
        console.log(`[FIFO Queue] ✓ Upload complete:`, result);

        // Mark as completed
        setFiles((prev) =>
          prev.map((f) => (f === fileUpload ? { ...f, status: "completed" as const, progress: 100 } : f)),
        );

        console.log(`[FIFO Queue] ✓ Completed: ${file.name}`);
      } catch (error) {
        console.error(`[FIFO Queue] ✗ Failed: ${fileUpload.file.name}`, error);
        setFiles((prev) =>
          prev.map((f) =>
            f === fileUpload
              ? {
                  ...f,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Upload failed",
                  progress: 0,
                }
              : f,
          ),
        );
      }
    }

    const successCount = files.filter((f) => f.status === "completed").length;
    const failedCount = files.filter((f) => f.status === "error").length;

    if (successCount > 0) {
      toast.success("Upload complete", {
        description: `${successCount} file(s) uploaded${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
      });

      // Trigger refresh
      window.dispatchEvent(new Event("file-uploaded"));
    } else if (failedCount > 0) {
      toast.error("Upload failed", {
        description: `${failedCount} file(s) failed to upload`,
      });
    }

    // Auto-close after a delay if all completed
    if (failedCount === 0) {
      setTimeout(() => {
        setFiles([]);
        onOpenChange(false);
      }, 1500);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getStatusIcon = (status: FileUpload["status"]) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="text-primary size-4 animate-spin" />;
      case "completed":
        return <div className="size-4 rounded-full bg-green-500" />;
      case "error":
        return <div className="bg-destructive size-4 rounded-full" />;
      default:
        return <FileText className="text-muted-foreground size-4" />;
    }
  };

  const allCompleted = files.length > 0 && files.every((f) => f.status === "completed");
  const hasFiles = files.length > 0;
  const canUpload = hasFiles && files.some((f) => f.status === "pending");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload documents to this vault. Files will be automatically processed for semantic search.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragging ? "bg-primary/10 border-primary" : "border-border hover:border-muted-foreground"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload className="text-muted-foreground mx-auto mb-4 size-10" />
            <h3 className="mb-2 font-medium">Drop files here or click to browse</h3>
            <p className="text-muted-foreground mb-4 text-sm">Supports PDF, DOCX, TXT, and images up to 100MB</p>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={allCompleted}>
              Select Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            />
          </div>

          {/* File List */}
          {hasFiles && (
            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {files.map((fileUpload, index) => (
                <div key={index} className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                  {getStatusIcon(fileUpload.status)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{fileUpload.file.name}</p>
                      <span className="text-muted-foreground text-xs">{formatFileSize(fileUpload.file.size)}</span>
                    </div>
                    {fileUpload.status === "uploading" && <Progress value={fileUpload.progress} className="mt-2 h-1" />}
                    {fileUpload.status === "error" && (
                      <p className="text-destructive mt-1 text-xs">{fileUpload.error}</p>
                    )}
                  </div>
                  {fileUpload.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 flex-shrink-0"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="size-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!allCompleted && hasFiles}>
            {allCompleted ? "Close" : "Cancel"}
          </Button>
          {!allCompleted && (
            <Button onClick={handleUpload} disabled={!canUpload}>
              Upload {files.length > 0 && `(${files.length})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
