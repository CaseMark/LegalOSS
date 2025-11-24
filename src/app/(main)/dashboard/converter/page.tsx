"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppHeader } from "@/app/(main)/dashboard/_components/header";
import { useVaults, useVaultObjects } from "@/lib/hooks/use-vaults";
import { ExternalLink, HardDrive, Link2, Loader2, RefreshCw, UploadCloud, Vault as VaultIcon } from "lucide-react";

const jobStatusesPolling = ["queued", "processing"];

type ConvertJobEntry = {
  jobId: string;
  status: string;
  createdAt: string;
  sourceLabel: string;
  sourceType: "vault" | "url";
  sourceVaultId?: string;
  sourceObjectId?: string;
  inputUrl?: string;
  callbackUrl?: string;
  uploadBack?: boolean;
  destVaultId?: string;
  uploaded?: boolean;
};

export default function ConverterPage() {
  const { vaults } = useVaults();
  const [useVaultSource, setUseVaultSource] = useState(true);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const { objects } = useVaultObjects(useVaultSource ? selectedVaultId : null);
  const [externalUrl, setExternalUrl] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [uploadBack, setUploadBack] = useState(false);
  const [destVaultId, setDestVaultId] = useState<string | null>(null);

  const [startingJob, setStartingJob] = useState(false);
  const [jobs, setJobs] = useState<ConvertJobEntry[]>([]);
  const [jobDetails, setJobDetails] = useState<Record<string, any>>({});
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [uploadingJobId, setUploadingJobId] = useState<string | null>(null);

  const selectedJob = selectedJobId ? jobDetails[selectedJobId] : null;

  useEffect(() => {
    if (!useVaultSource) {
      setSelectedVaultId(null);
      setSelectedObjectId(null);
    }
  }, [useVaultSource]);

  useEffect(() => {
    if (vaults.length && !selectedVaultId) {
      setSelectedVaultId(vaults[0]?.id || null);
    }
    if (vaults.length && !destVaultId) {
      setDestVaultId(vaults[0]?.id || null);
    }
  }, [vaults, selectedVaultId, destVaultId]);

  useEffect(() => {
    const interval = setInterval(() => {
      jobs
        .filter((job) => jobStatusesPolling.includes(job.status))
        .forEach((job) => refreshJob(job.jobId));
    }, 8000);

    return () => clearInterval(interval);
  }, [jobs]);

  const refreshJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/convert/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch job");
      }
      const detail = await response.json();
      setJobDetails((prev) => ({ ...prev, [jobId]: detail }));
      setJobs((prev) =>
        prev.map((job) =>
          job.jobId === jobId
            ? {
                ...job,
                status: detail.status,
              }
            : job,
        ),
      );
    } catch (error: any) {
      console.error("Failed to refresh job", error);
    }
  };

  const startConversion = async () => {
    try {
      setStartingJob(true);
      let inputUrlValue = externalUrl;
      let sourceLabel = externalUrl || "External URL";
      let sourceVault: string | undefined;
      let sourceObject: string | undefined;

      if (useVaultSource) {
        if (!selectedVaultId || !selectedObjectId) {
          toast.error("Select a vault and object to convert");
          return;
        }

        const objectResponse = await fetch(`/api/vaults/${selectedVaultId}/objects/${selectedObjectId}`);
        if (!objectResponse.ok) {
          throw new Error("Failed to load vault object");
        }
        const objectData = await objectResponse.json();
        inputUrlValue = objectData.object?.downloadUrl;
        sourceLabel = objectData.object?.filename || "Vault object";
        sourceVault = selectedVaultId;
        sourceObject = selectedObjectId;
      }

      if (!inputUrlValue) {
        toast.error("Provide a valid source (vault object or external URL)");
        return;
      }

      const response = await fetch("/api/convert/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_url: inputUrlValue,
          callback_url: callbackUrl || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to start conversion" }));
        throw new Error(error.error || "Failed to start conversion");
      }

      const payload = await response.json();
      const jobId = payload.job_id;

      const newJob: ConvertJobEntry = {
        jobId,
        status: payload.status || "queued",
        createdAt: new Date().toISOString(),
        sourceLabel,
        sourceType: useVaultSource ? "vault" : "url",
        sourceVaultId: sourceVault,
        sourceObjectId: sourceObject,
        inputUrl: inputUrlValue,
        callbackUrl: callbackUrl || undefined,
        uploadBack,
        destVaultId: uploadBack ? destVaultId || undefined : undefined,
      };

      setJobs((prev) => [newJob, ...prev]);
      setSelectedJobId(jobId);
      refreshJob(jobId);
      toast.success("Conversion started");
    } catch (error: any) {
      toast.error(error.message || "Failed to start conversion");
    } finally {
      setStartingJob(false);
    }
  };

  const downloadJob = async (jobId: string) => {
    try {
      setDownloadingJobId(jobId);
      const response = await fetch(`/api/convert/download/${jobId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Download failed" }));
        throw new Error(error.error || "Download failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `converted-${jobId}.m4a`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.message || "Download failed");
    } finally {
      setDownloadingJobId(null);
    }
  };

  const uploadToVault = async (job: ConvertJobEntry) => {
    if (!job.destVaultId) {
      toast.error("Destination vault required");
      return;
    }
    try {
      setUploadingJobId(job.jobId);
      const response = await fetch(`/api/convert/download/${job.jobId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Download failed" }));
        throw new Error(error.error || "Download failed");
      }
      const blob = await response.blob();
      const formData = new FormData();
      const fileName = `converted-${job.jobId}.m4a`;
      const file = new File([blob], fileName, { type: blob.type || "audio/mp4" });
      formData.append("file", file);

      const uploadResponse = await fetch(`/api/vaults/${job.destVaultId}/upload-file`, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error.error || "Upload failed");
      }

      setJobs((prev) =>
        prev.map((entry) =>
          entry.jobId === job.jobId
            ? {
                ...entry,
                uploaded: true,
              }
            : entry,
        ),
      );
      toast.success("Uploaded to vault");
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploadingJobId(null);
    }
  };

  const filteredJobs = jobs;

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Converter"
        description="Convert FTR recordings into standard audio and retrieve them directly from your vaults."
      >
        <Button variant="outline" asChild>
          <a href="https://docs.case.dev/services/convert" target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 size-4" />
            Docs
          </a>
        </Button>
      </AppHeader>
      <div className="flex flex-1 flex-col gap-4 px-6 pb-6">
        <Alert>
          <AlertTitle>Convert API</AlertTitle>
          <AlertDescription>
            This UI proxies <code>/convert/v1/process</code>, <code>/jobs</code>, and <code>/download</code> with your
            Case.dev API key. Choose a vault file or provide a presigned URL.
          </AlertDescription>
        </Alert>
        <Tabs defaultValue="start" className="flex flex-1 flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="start">Start Conversion</TabsTrigger>
            <TabsTrigger value="jobs">Jobs & Status</TabsTrigger>
          </TabsList>

          <TabsContent value="start" className="mt-4 flex flex-col gap-4 lg:flex-row">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-foreground">Source & Options</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Convert FTR recordings by selecting a vault object or providing an external URL.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-foreground font-medium">Use vault object</p>
                    <p className="text-muted-foreground text-sm">Choose files directly from your vault</p>
                  </div>
                  <Switch checked={useVaultSource} onCheckedChange={setUseVaultSource} />
                </div>

                {useVaultSource ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Vault</Label>
                      <Select value={selectedVaultId ?? ""} onValueChange={setSelectedVaultId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vault" />
                        </SelectTrigger>
                        <SelectContent>
                          {vaults.map((vault: any) => (
                            <SelectItem key={vault.id} value={vault.id}>
                              {vault.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Object</Label>
                      <Select value={selectedObjectId ?? ""} onValueChange={setSelectedObjectId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select object" />
                        </SelectTrigger>
                        <SelectContent>
                          {(objects || []).map((object: any) => (
                            <SelectItem key={object.id} value={object.id}>
                              {object.filename}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Presigned URL</Label>
                    <Input
                      value={externalUrl}
                      onChange={(event) => setExternalUrl(event.target.value)}
                      placeholder="https://example.com/file.ftr"
                    />
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label>Callback URL (optional)</Label>
                  <Input
                    value={callbackUrl}
                    onChange={(event) => setCallbackUrl(event.target.value)}
                    placeholder="https://yourapp.com/webhooks/convert"
                  />
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-foreground font-medium">Upload result to vault</p>
                      <p className="text-muted-foreground text-sm">Store converted audio in one of your vaults</p>
                    </div>
                    <Switch checked={uploadBack} onCheckedChange={setUploadBack} />
                  </div>
                  {uploadBack && (
                    <div className="mt-4 space-y-2">
                      <Label>Destination Vault</Label>
                      <Select value={destVaultId ?? ""} onValueChange={setDestVaultId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination vault" />
                        </SelectTrigger>
                        <SelectContent>
                          {vaults.map((vault: any) => (
                            <SelectItem key={vault.id} value={vault.id}>
                              {vault.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Button className="w-full" onClick={startConversion} disabled={startingJob}>
                  {startingJob ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Starting conversion...
                    </>
                  ) : (
                    <>
                      <HardDrive className="mr-2 size-4" />
                      Start Conversion
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-foreground">Recent Jobs</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Latest conversions appear here as you create them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredJobs.length === 0 ? (
                  <div className="text-muted-foreground flex h-52 items-center justify-center text-sm">
                    No jobs yet. Start one to see it here.
                  </div>
                ) : (
                  <ScrollArea className="h-[360px] pr-2">
                    <div className="space-y-3">
                      {filteredJobs.map((job) => (
                        <div
                          key={job.jobId}
                          className="rounded-lg border p-3 hover:border-primary"
                          onClick={() => setSelectedJobId(job.jobId)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-foreground font-medium">{job.sourceLabel}</p>
                              <p className="text-muted-foreground text-xs">{job.jobId}</p>
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {job.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="mt-4 flex flex-col gap-4 lg:flex-row">
            <Card className="flex-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Conversion Jobs</CardTitle>
                  <CardDescription className="text-muted-foreground">Monitor progress and manage outputs.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => filteredJobs.forEach((job) => refreshJob(job.jobId))}>
                  <RefreshCw className="mr-2 size-4" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <TableRow key={job.jobId}>
                        <TableCell className="font-mono text-xs">{job.jobId}</TableCell>
                        <TableCell>{job.sourceLabel}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedJobId(job.jobId)}>
                            Details
                          </Button>
                          {job.status === "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadJob(job.jobId)}
                              disabled={downloadingJobId === job.jobId}
                            >
                              {downloadingJobId === job.jobId ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Link2 className="size-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="w-full lg:w-1/2">
              <CardHeader>
                <CardTitle className="text-foreground">Job Detail</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {selectedJobId ? `Details for ${selectedJobId}` : "Select a job to inspect progress"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedJobId ? (
                  <div className="text-muted-foreground py-24 text-center text-sm">Select a job to view details.</div>
                ) : !selectedJob ? (
                  <div className="text-muted-foreground py-24 text-center text-sm">Loading job...</div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <p className="text-foreground font-medium">{selectedJob.status}</p>
                      <p className="text-muted-foreground text-sm">
                        {selectedJob.progress ? `${selectedJob.progress}% complete` : "Awaiting progress data"}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span>{selectedJob.duration_seconds ? `${selectedJob.duration_seconds}s` : "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">File Size</span>
                        <span>
                          {selectedJob.file_size_bytes
                            ? `${(selectedJob.file_size_bytes / (1024 * 1024)).toFixed(2)} MB`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Download URL</span>
                        <span>{selectedJob.download_url ? "Ready" : "Pending"}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        disabled={downloadingJobId === selectedJobId}
                        onClick={() => downloadJob(selectedJobId)}
                      >
                        {downloadingJobId === selectedJobId ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Downloading
                          </>
                        ) : (
                          <>
                            <Link2 className="mr-2 size-4" />
                            Download Audio
                          </>
                        )}
                      </Button>
                      {(() => {
                        const jobEntry = jobs.find((job) => job.jobId === selectedJobId);
                        if (!jobEntry || jobEntry.status !== "completed" || !jobEntry.destVaultId) {
                          return null;
                        }
                        return (
                          <Button
                            variant="outline"
                            onClick={() => uploadToVault(jobEntry)}
                            disabled={jobEntry.uploaded || uploadingJobId === jobEntry.jobId}
                          >
                            {jobEntry.uploaded ? (
                              <>
                                <VaultIcon className="mr-2 size-4" />
                                Uploaded
                              </>
                            ) : uploadingJobId === jobEntry.jobId ? (
                              <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Uploading
                              </>
                            ) : (
                              <>
                                <UploadCloud className="mr-2 size-4" />
                                Upload to Vault
                              </>
                            )}
                          </Button>
                        );
                      })()}
                    </div>
                    {selectedJob.error && (
                      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                        {selectedJob.error}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

