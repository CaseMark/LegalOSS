"use client";

import { useState } from "react";
import { Plus, Filter, FileAudio, Clock, CheckCircle, XCircle, Users } from "lucide-react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { SubmitTranscriptionDialog } from "./submit-transcription-dialog";
import { TranscriptionJobDetail } from "./transcription-job-detail";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function AsyncTranscription() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, mutate } = useSWR("/api/transcription", fetcher, {
    refreshInterval: 5000, // Auto-refresh every 5 seconds
  });

  const jobs = data?.jobs || [];

  const filteredJobs = jobs.filter((job: any) => {
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesSearch = !searchQuery || job.filename?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: jobs.length,
    queued: jobs.filter((j: any) => j.status === "queued").length,
    processing: jobs.filter((j: any) => j.status === "processing").length,
    completed: jobs.filter((j: any) => j.status === "completed").length,
    failed: jobs.filter((j: any) => j.status === "error").length,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      completed: { variant: "default", icon: CheckCircle },
      processing: { variant: "secondary", icon: Clock },
      queued: { variant: "outline", icon: Clock },
      error: { variant: "destructive", icon: XCircle },
    };

    const config = variants[status] || variants.queued;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="capitalize">
        <Icon className="mr-1 size-3" />
        {status}
      </Badge>
    );
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (selectedJob) {
    return (
      <TranscriptionJobDetail
        jobId={selectedJob}
        onBack={() => {
          setSelectedJob(null);
          mutate();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-foreground text-sm font-medium">Total Jobs</CardTitle>
            <FileAudio className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-foreground text-sm font-medium">Queued</CardTitle>
            <Clock className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-bold">{stats.queued}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-foreground text-sm font-medium">Processing</CardTitle>
            <Clock className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-bold">{stats.processing}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-foreground text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-foreground text-sm font-medium">Failed</CardTitle>
            <XCircle className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-foreground text-2xl font-bold">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 size-4" />
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="error">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>

        <Button onClick={() => setShowSubmitDialog(true)}>
          <Plus className="mr-2 size-4" />
          Transcribe Audio
        </Button>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Transcription Jobs</CardTitle>
          <CardDescription className="text-muted-foreground">
            Track and manage your audio transcription jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center py-12">Loading jobs...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileAudio className="text-muted-foreground mb-4 size-12" />
              <h3 className="text-foreground text-lg font-medium">No transcription jobs found</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Submit your first audio file for transcription"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button onClick={() => setShowSubmitDialog(true)}>
                  <Plus className="mr-2 size-4" />
                  Transcribe Audio
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Audio File</TableHead>
                  <TableHead className="text-muted-foreground">Language</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Duration</TableHead>
                  <TableHead className="text-muted-foreground">Created</TableHead>
                  <TableHead className="text-muted-foreground w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job: any) => (
                  <TableRow
                    key={job.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedJob(job.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileAudio className="text-muted-foreground size-4" />
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium">{job.filename}</span>
                          {job.speakerLabels && (
                            <div className="flex items-center gap-1">
                              <Users className="text-muted-foreground size-3" />
                              <span className="text-muted-foreground text-xs">Speaker labels</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground text-sm uppercase">{job.languageCode}</TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell className="text-foreground text-sm">
                      {job.audioDuration ? formatDuration(job.audioDuration) : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(job.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job.id);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Submit Dialog */}
      <SubmitTranscriptionDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog} onSuccess={mutate} />
    </div>
  );
}
