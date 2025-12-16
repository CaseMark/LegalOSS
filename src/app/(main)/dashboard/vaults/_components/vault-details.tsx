"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Download, FileText, MoreVertical, RefreshCw, Search, Trash2, Upload, Zap } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVault, useVaultObjects } from "@/lib/hooks/use-vaults";

import { FileDetailsDialog } from "./file-details-dialog";
import { UploadFileDialog } from "./upload-file-dialog";
import { SearchDialog } from "./search-dialog";

interface VaultDetailsProps {
  vaultId: string;
  onBack: () => void;
}

interface VaultFile {
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

export function VaultDetails({ vaultId, onBack }: VaultDetailsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);

  const { vault, isLoading: vaultLoading } = useVault(vaultId);
  const { objects, isLoading: objectsLoading, mutate: mutateObjects } = useVaultObjects(vaultId);

  // Listen for file uploaded event to refresh the list
  useEffect(() => {
    const handleFileUploaded = () => {
      console.log("File uploaded, refreshing objects...");
      mutateObjects();
    };

    window.addEventListener("file-uploaded", handleFileUploaded);
    return () => window.removeEventListener("file-uploaded", handleFileUploaded);
  }, [mutateObjects]);

  const isLoading = vaultLoading || objectsLoading;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const vaultInfo = vault
    ? {
        id: vaultId,
        name: vault.name || "Unnamed Vault",
        description: vault.description,
        objectCount: vault.objectCount || objects.length || 0,
        totalSize: formatBytes(vault.totalBytes || 0),
      }
    : null;

  const files: VaultFile[] = objects.map((obj: any) => ({
    id: obj.id,
    filename: obj.filename || obj.key?.split("/").pop() || "Unknown",
    size: formatBytes(obj.size || 0),
    sizeBytes: obj.size || 0, // Keep raw bytes for calculations
    uploadedAt: obj.createdAt || obj.uploadedAt || new Date().toISOString(),
    status: obj.status || obj.ingestionStatus || "pending",
    contentType: obj.contentType || "application/octet-stream",
    chunkCount: obj.chunkCount,
    vectorCount: obj.vectorCount,
    pageCount: obj.pageCount,
    textLength: obj.textLength,
    ingestionStatus: obj.ingestionStatus, // Direct from Case.dev API
    ingestionCompletedAt: obj.ingestionCompletedAt,
  }));

  // Calculate total storage from files
  const totalStorageBytes = files.reduce((sum, file) => sum + (file.sizeBytes || 0), 0);

  const filteredFiles = files.filter((file) => file.filename.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutateObjects();
      toast.success("Refreshed", {
        description: "Vault contents updated",
      });
    } catch (error) {
      toast.error("Failed to refresh", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBulkIngest = async (enableGraphRAG: boolean = false) => {
    setIsIngesting(true);

    // Get all pending files
    const pendingFiles = files.filter((f) => {
      const status = f.ingestionStatus?.toLowerCase();
      return status === "pending" || (!f.chunkCount && !status);
    });

    if (pendingFiles.length === 0) {
      toast.info("No files to ingest", {
        description: "All files are already indexed or processing",
      });
      setIsIngesting(false);
      return;
    }

    const modeLabel = enableGraphRAG ? "with GraphRAG" : "standard";
    const loadingToast = toast.loading(`Ingesting ${pendingFiles.length} file(s) ${modeLabel}...`, {
      description: "This may take several minutes for large files",
    });

    let successCount = 0;
    let failedCount = 0;

    for (const file of pendingFiles) {
      try {
        const response = await fetch(`/api/vaults/${vaultId}/ingest/${file.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enable_graphrag: enableGraphRAG }),
        });

        if (response.ok) {
          successCount++;
          console.log(`✓ Triggered ingestion for: ${file.filename} (GraphRAG: ${enableGraphRAG})`);
        } else {
          const errorText = await response.text().catch(() => "");
          let errorMessage = "Unknown error";
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorText;
          } catch {
            errorMessage = errorText || `HTTP ${response.status}`;
          }
          failedCount++;
          console.error(`✗ Failed to ingest: ${file.filename} - ${errorMessage}`);
          // Show the first error as a toast
          if (failedCount === 1) {
            toast.error(`Ingestion failed`, {
              description: errorMessage,
            });
          }
        }
      } catch (error) {
        failedCount++;
        console.error(`✗ Error ingesting ${file.filename}:`, error);
      }
    }

    toast.dismiss(loadingToast);

    if (successCount > 0) {
      toast.success("Ingestion triggered", {
        description: `${successCount} file(s) submitted ${modeLabel}${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
        duration: 5000,
      });

      // Refresh after a delay to show updated status
      setTimeout(() => {
        mutateObjects();
      }, 2000);
    } else {
      toast.error("Ingestion failed", {
        description: `Failed to trigger ingestion for ${failedCount} file(s)`,
      });
    }

    setIsIngesting(false);
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      // Note: We'd need to implement a download endpoint that streams the file
      // For now, open in new tab
      window.open(`/api/vaults/${vaultId}/objects/${fileId}/download`, "_blank");
      toast.success("Download started", {
        description: filename,
      });
    } catch (error) {
      toast.error("Download failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const handleDelete = async (fileId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      // TODO: Implement delete endpoint
      toast.info("Delete functionality coming soon");
    } catch (error) {
      toast.error("Delete failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const handleProcessWithOCR = (fileId: string, filename: string) => {
    console.log("handleProcessWithOCR called with:", { fileId, filename });

    // Use setTimeout to ensure it runs after dropdown closes
    setTimeout(async () => {
      // Show loading toast immediately
      const loadingToast = toast.loading("Submitting OCR job...", {
        description: `Processing ${filename}`,
      });

      try {
        console.log("Submitting OCR job for:", { vaultId, fileId, filename });

        const response = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vaultId,
            objectId: fileId,
            engine: "doctr",
            features: { embed: {} },
          }),
        });

        const result = await response.json();
        console.log("OCR submission result:", result);

        if (!response.ok) {
          throw new Error(result.error || "Failed to submit OCR job");
        }

        // Dismiss loading toast
        toast.dismiss(loadingToast);

        // Show success toast with action
        toast.success("OCR job submitted successfully!", {
          description: `Processing ${filename} - Job ID: ${result.id}`,
          duration: 5000,
          action: {
            label: "View Progress",
            onClick: () => {
              window.location.href = `/dashboard/ocr`;
            },
          },
        });
      } catch (error) {
        console.error("OCR submission error:", error);
        toast.dismiss(loadingToast);
        toast.error("Failed to submit OCR job", {
          description: error instanceof Error ? error.message : "Please try again",
          duration: 5000,
        });
      }
    }, 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUploadStatus = (file: VaultFile) => {
    // If file has an ID and a createdAt date, it's been uploaded to S3
    // (Case.dev API may return sizeBytes: 0 even for uploaded files)
    return file.id ? "uploaded" : "pending";
  };

  const getIndexStatus = (file: VaultFile) => {
    // Use ingestionStatus from Case.dev API as source of truth
    const ingestionStatus = file.ingestionStatus?.toLowerCase();

    if (ingestionStatus === "completed" || (file.chunkCount && file.chunkCount > 0)) {
      return "indexed";
    }
    if (ingestionStatus === "processing" || ingestionStatus === "ingesting") {
      return "processing";
    }
    if (ingestionStatus === "failed" || ingestionStatus === "error") {
      return "error";
    }
    // If uploaded to S3 but not yet ingested
    return "pending";
  };

  const getGraphStatus = (file: VaultFile) => {
    // Check if GraphRAG is enabled for vault
    if (!vault?.enableGraph) {
      return "disabled";
    }

    // TODO: Case.dev API doesn't currently return separate graph status
    // For now, GraphRAG requires manual initialization via POST /vault/:id/graphrag/init
    // after files are indexed. We'll show 'pending' until that's implemented.

    // When API returns graph-specific status, check it here:
    // if (file.graphStatus === 'completed') return 'graphed';
    // if (file.graphStatus === 'processing') return 'processing';

    return "pending";
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "uploaded":
      case "indexed":
      case "graphed":
        return "default";
      case "processing":
        return "secondary";
      case "pending":
        return "outline";
      case "disabled":
        return "outline";
      case "error":
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">Loading vault...</div>
        </div>
      </div>
    );
  }

  if (!vaultInfo) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">Vault not found</div>
          <Button onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{vaultInfo.name}</h2>
          <p className="text-muted-foreground text-sm">{vaultInfo.description || "No description"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isIngesting}>
                <Zap className="mr-2 size-4" />
                {isIngesting ? "Ingesting..." : "Ingest All"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleBulkIngest(false)}>
                <Zap className="mr-2 size-4" />
                Standard Indexing (Recommended)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleBulkIngest(true)}>
                <Search className="mr-2 size-4" />
                With GraphRAG (Slower, Advanced Search)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setShowSearchDialog(true)}>
            <Search className="mr-2 size-4" />
            Semantic Search
          </Button>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="mr-2 size-4" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-medium">Total Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-bold">{vaultInfo.objectCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-medium">Storage Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-bold">{formatBytes(totalStorageBytes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-medium">Searchable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-bold">
              {files.filter((f) => ["completed", "processed"].includes(f.status.toLowerCase())).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-bold">
              {
                files.filter((f) => ["pending", "processing", "ingesting", "uploaded"].includes(f.status.toLowerCase()))
                  .length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="files" className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <div className="relative w-72">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Filter files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TabsContent value="files" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>All files stored in this vault</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="text-muted-foreground mb-4 size-12" />
                  <h3 className="text-lg font-medium">No files found</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    {searchQuery ? "Try adjusting your search" : "Upload files to get started"}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setShowUploadDialog(true)}>
                      <Upload className="mr-2 size-4" />
                      Upload Files
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Indexed</TableHead>
                      <TableHead>Graphed</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="text-muted-foreground size-4 flex-shrink-0" />
                            <span className="font-medium">{file.filename}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{file.size}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(getUploadStatus(file))} className="text-xs capitalize">
                            {getUploadStatus(file)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={getStatusBadgeVariant(getIndexStatus(file))}
                              className="w-fit text-xs capitalize"
                            >
                              {getIndexStatus(file)}
                            </Badge>
                            {file.chunkCount != null && file.chunkCount > 0 && (
                              <div className="text-muted-foreground text-xs">
                                {file.chunkCount}c / {file.vectorCount || 0}v
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(getGraphStatus(file))} className="text-xs capitalize">
                            {getGraphStatus(file)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatDate(file.uploadedAt)}</TableCell>
                        <TableCell>
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleDownload(file.id, file.filename);
                                }}
                              >
                                <Download className="mr-2 size-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setSelectedFile(file);
                                  setShowFileDetails(true);
                                }}
                              >
                                <FileText className="mr-2 size-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  console.log("OCR menu item clicked for:", file.id);
                                  handleProcessWithOCR(file.id, file.filename);
                                }}
                              >
                                <Search className="mr-2 size-4" />
                                Process with OCR
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleDelete(file.id, file.filename);
                                }}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Recent uploads, downloads, and modifications</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">No recent activity</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Vault Settings</CardTitle>
              <CardDescription>Configure vault properties and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 text-sm font-medium">Encryption</h4>
                  <p className="text-muted-foreground text-sm">AES-256 with AWS KMS</p>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium">Region</h4>
                  <p className="text-muted-foreground text-sm">US East (Virginia)</p>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium">Created</h4>
                  <p className="text-muted-foreground text-sm">November 1, 2024</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <UploadFileDialog open={showUploadDialog} onOpenChange={setShowUploadDialog} vaultId={vaultId} />
      <SearchDialog open={showSearchDialog} onOpenChange={setShowSearchDialog} vaultId={vaultId} />
      <FileDetailsDialog open={showFileDetails} onOpenChange={setShowFileDetails} file={selectedFile} />
    </div>
  );
}
