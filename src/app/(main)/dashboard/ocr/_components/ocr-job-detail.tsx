"use client";

import { useState } from "react";

import dynamic from "next/dynamic";

import { ArrowLeft, Download, FileText, AlertCircle, Eye } from "lucide-react";
import useSWR from "swr";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Load OCR Evaluation only on client-side (PDF.js needs browser APIs)
const OCREvaluation = dynamic(() => import("./ocr-evaluation").then((mod) => ({ default: mod.OCREvaluation })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-muted-foreground">Loading PDF viewer...</div>
    </div>
  ),
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface OCRJobDetailProps {
  jobId: string;
  onBack: () => void;
}

export function OCRJobDetail({ jobId, onBack }: OCRJobDetailProps) {
  const [showEvaluation, setShowEvaluation] = useState(false);

  const { data: job, isLoading } = useSWR(`/api/ocr/${jobId}`, fetcher, {
    refreshInterval: (data) => {
      // Poll every 3 seconds if processing, otherwise don't poll
      return data?.status === "processing" || data?.status === "pending" ? 3000 : 0;
    },
  });

  if (showEvaluation) {
    return <OCREvaluation jobId={jobId} onBack={() => setShowEvaluation(false)} />;
  }

  if (isLoading || !job) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading job details...</div>
      </div>
    );
  }

  const progress = job.chunk_count > 0 ? Math.round((job.chunks_completed / job.chunk_count) * 100) : 0;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: "default",
      processing: "secondary",
      pending: "outline",
      failed: "destructive",
      canceled: "destructive",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="text-sm capitalize">
        {status}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-foreground text-2xl font-bold">OCR Job Details</h2>
          <p className="text-muted-foreground text-sm break-all">Job ID: {job.id}</p>
        </div>
        {job.status === "completed" && (
          <Button onClick={() => setShowEvaluation(true)}>
            <Eye className="mr-2 size-4" />
            Evaluate Results
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {job.status === "failed" && job.error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Processing Failed</AlertTitle>
          <AlertDescription className="text-sm">{job.error}</AlertDescription>
        </Alert>
      )}

      {/* Job Info Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-medium">Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="text-muted-foreground size-4" />
              <span className="text-foreground text-sm font-medium break-all">{job.filename || job.document_id}</span>
            </div>
            {job.vaultId && <p className="text-muted-foreground text-xs">From vault: {job.vaultId}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {getStatusBadge(job.status)}
            <p className="text-muted-foreground text-xs">
              Engine: <span className="text-foreground">{job.engine}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-medium">Timing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-muted-foreground text-xs">Started: {new Date(job.created_at).toLocaleString()}</p>
            {job.completed_at && (
              <p className="text-muted-foreground text-xs">Completed: {new Date(job.completed_at).toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      {(job.status === "processing" || job.status === "pending") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Processing Progress</CardTitle>
            <CardDescription className="text-muted-foreground">
              {job.chunks_completed} of {job.chunk_count} chunks completed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Completed</p>
                <p className="text-foreground font-medium">{job.chunks_completed}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Processing</p>
                <p className="text-foreground font-medium">{job.chunks_processing}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Failed</p>
                <p className="text-foreground font-medium">{job.chunks_failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results (when completed) */}
      {job.status === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Results</CardTitle>
            <CardDescription className="text-muted-foreground">Extracted text and analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">Pages</p>
                <p className="text-foreground text-2xl font-bold">{job.page_count || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Text Length</p>
                <p className="text-foreground text-2xl font-bold">
                  {job.text_length ? `${Math.round(job.text_length / 1000)}K` : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Confidence</p>
                <p className="text-foreground text-2xl font-bold">{job.confidence ? `${job.confidence}%` : "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Chunks</p>
                <p className="text-foreground text-2xl font-bold">{job.chunk_count}</p>
              </div>
            </div>

            {/* Download Results */}
            <div className="border-border space-y-3 border-t pt-4">
              <p className="text-foreground text-sm font-medium">Download Results</p>
              <p className="text-muted-foreground mb-3 text-xs">Extract your OCR results in multiple formats</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/ocr/${jobId}/download/text`} download>
                    <Download className="mr-2 size-3" />
                    Plain Text
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/ocr/${jobId}/download/json`} download>
                    <Download className="mr-2 size-3" />
                    JSON (with coordinates)
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/ocr/${jobId}/download/pdf`} download>
                    <Download className="mr-2 size-3" />
                    Searchable PDF
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/ocr/${jobId}/download/original`} download>
                    <Download className="mr-2 size-3" />
                    Original Document
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-muted-foreground text-xs">Engine</p>
            <p className="text-foreground text-sm">{job.engine}</p>
          </div>
          {job.features && Object.keys(job.features).length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs">Features</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.keys(job.features).map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {job.document_url && (
            <div>
              <p className="text-muted-foreground text-xs">Source URL</p>
              <p className="text-foreground text-sm break-all">{job.document_url}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
