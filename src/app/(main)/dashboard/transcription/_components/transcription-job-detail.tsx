"use client";

import { ArrowLeft, Download, Users, Clock, FileText } from "lucide-react";
import useSWR from "swr";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TranscriptionJobDetailProps {
  jobId: string;
  onBack: () => void;
}

export function TranscriptionJobDetail({ jobId, onBack }: TranscriptionJobDetailProps) {
  const { data: job, isLoading } = useSWR(`/api/transcription/${jobId}`, fetcher, {
    refreshInterval: (data) => {
      return data?.status === "processing" || data?.status === "queued" ? 3000 : 0;
    },
  });

  if (isLoading || !job) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading transcription...</div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: "default",
      processing: "secondary",
      queued: "outline",
      error: "destructive",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="text-sm capitalize">
        {status}
      </Badge>
    );
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const downloadTranscript = () => {
    if (!job.text) return;

    const blob = new Blob([job.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${jobId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = async () => {
    const response = await fetch(`/api/transcription/${jobId}`);
    const data = await response.json();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${jobId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-foreground text-2xl font-bold">Transcription Details</h2>
          <p className="text-muted-foreground text-sm break-all">Job ID: {job.id}</p>
        </div>
        {job.status === "completed" && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTranscript}>
              <Download className="mr-2 size-4" />
              Download Text
            </Button>
            <Button variant="outline" onClick={downloadJSON}>
              <Download className="mr-2 size-4" />
              Download JSON
            </Button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {job.status === "error" && job.error && (
        <Alert variant="destructive">
          <AlertTitle>Transcription Failed</AlertTitle>
          <AlertDescription className="text-sm">{job.error}</AlertDescription>
        </Alert>
      )}

      {/* Job Info Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-medium">Audio File</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-sm font-medium break-all">{job.filename || "Audio recording"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {getStatusBadge(job.status)}
            <p className="text-muted-foreground text-xs">
              Language: <span className="text-foreground uppercase">{job.language_code}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-medium">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground size-4" />
              <span className="text-foreground text-sm">
                {job.audio_duration ? formatDuration(job.audio_duration) : "Processing..."}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-medium">Features</CardTitle>
          </CardHeader>
          <CardContent>
            {job.speaker_labels && (
              <div className="flex items-center gap-1.5">
                <Users className="text-muted-foreground size-4" />
                <span className="text-foreground text-sm">Speaker labels</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results (when completed) */}
      {job.status === "completed" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-xs">Word Count</p>
                  <p className="text-foreground text-2xl font-bold">{job.words?.length || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Confidence</p>
                  <p className="text-foreground text-2xl font-bold">
                    {job.confidence ? `${Math.round(job.confidence * 100)}%` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{job.speaker_labels ? "Speakers" : "Utterances"}</p>
                  <p className="text-foreground text-2xl font-bold">{job.utterances?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Full Transcript</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Complete transcription with{job.speaker_labels && " speaker labels and"} timestamps
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="bg-muted/30 h-[500px] rounded-lg border p-4">
                {job.utterances && job.utterances.length > 0 ? (
                  <div className="space-y-4">
                    {job.utterances.map((utterance: any, index: number) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center gap-2">
                          {job.speaker_labels && utterance.speaker && (
                            <Badge variant="outline" className="text-xs">
                              {utterance.speaker}
                            </Badge>
                          )}
                          <span className="text-muted-foreground text-xs">{Math.floor(utterance.start / 1000)}s</span>
                        </div>
                        <p className="text-foreground text-sm leading-relaxed">{utterance.text}</p>
                        {index < job.utterances.length - 1 && <Separator className="mt-3" />}
                      </div>
                    ))}
                  </div>
                ) : job.text ? (
                  <pre className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{job.text}</pre>
                ) : (
                  <p className="text-muted-foreground text-sm">No transcript available</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {/* Processing State */}
      {(job.status === "processing" || job.status === "queued") && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="space-y-2 text-center">
              <p className="text-foreground font-medium">
                {job.status === "queued" ? "Waiting to start..." : "Transcribing audio..."}
              </p>
              <p className="text-muted-foreground text-sm">This may take a few minutes depending on audio length</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
