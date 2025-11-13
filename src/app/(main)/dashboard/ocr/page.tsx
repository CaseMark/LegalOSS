"use client";

import { useState, useEffect } from "react";

import { useSearchParams } from "next/navigation";

import { ScanText, Plus, Filter, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { OCRJobDetail } from "./_components/ocr-job-detail";
import { SubmitOCRDialog } from "./_components/submit-ocr-dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OCRPage() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();

  const { data, isLoading, mutate } = useSWR("/api/ocr", fetcher, {
    refreshInterval: 5000, // Auto-refresh every 5 seconds for active jobs
  });

  // Check for job parameter in URL
  useEffect(() => {
    const jobParam = searchParams.get("job");
    if (jobParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedJob(jobParam);
    }
  }, [searchParams]);

  const jobs = data?.jobs ?? [];

  const filteredJobs = jobs.filter((job: any) => {
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      job.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.documentId?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: jobs.length,
    pending: jobs.filter((j: any) => j.status === "pending").length,
    processing: jobs.filter((j: any) => j.status === "processing").length,
    completed: jobs.filter((j: any) => j.status === "completed").length,
    failed: jobs.filter((j: any) => j.status === "failed" || j.status === "canceled").length,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      completed: { variant: "default", icon: CheckCircle },
      processing: { variant: "secondary", icon: Clock },
      pending: { variant: "outline", icon: Clock },
      failed: { variant: "destructive", icon: XCircle },
      canceled: { variant: "destructive", icon: XCircle },
    };

    const config = variants[status] ?? variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="capitalize">
        <Icon className="mr-1 size-3" />
        {status}
      </Badge>
    );
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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Document OCR</h1>
          <p className="text-muted-foreground mt-1">
            Extract text from legal documents with AI-powered optical character recognition
          </p>
        </div>
        <Button onClick={() => setShowSubmitDialog(true)}>
          <Plus className="mr-2 size-4" />
          Process Document
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {selectedJob ? (
          <OCRJobDetail
            jobId={selectedJob}
            onBack={() => {
              setSelectedJob(null);
              mutate();
            }}
          />
        ) : (
          <Tabs defaultValue="all" className="flex h-full flex-col">
            <div className="mb-4 flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">All Jobs</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="mr-2 size-4" />
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>

            <TabsContent value="all" className="mt-0 flex-1 space-y-4 overflow-auto">
              {/* Stats Cards */}
              <div className="mb-6 grid gap-4 md:grid-cols-5">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-foreground text-sm font-medium">Total Jobs</CardTitle>
                    <ScanText className="text-muted-foreground size-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-foreground text-2xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-foreground text-sm font-medium">Pending</CardTitle>
                    <Clock className="text-muted-foreground size-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-foreground text-2xl font-bold">{stats.pending}</div>
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

              {/* Jobs Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">OCR Jobs</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Track and manage your document processing jobs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-muted-foreground flex items-center justify-center py-12">Loading jobs...</div>
                  ) : filteredJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <FileText className="text-muted-foreground mb-4 size-12" />
                      <h3 className="text-foreground text-lg font-medium">No OCR jobs found</h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        {searchQuery || statusFilter !== "all"
                          ? "Try adjusting your filters"
                          : "Submit your first document for OCR processing"}
                      </p>
                      {!searchQuery && statusFilter === "all" && (
                        <Button onClick={() => setShowSubmitDialog(true)}>
                          <Plus className="mr-2 size-4" />
                          Process Document
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-muted-foreground">Document</TableHead>
                          <TableHead className="text-muted-foreground">Engine</TableHead>
                          <TableHead className="text-muted-foreground">Status</TableHead>
                          <TableHead className="text-muted-foreground">Progress</TableHead>
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
                                <FileText className="text-muted-foreground size-4" />
                                <div className="flex flex-col">
                                  <span className="text-foreground font-medium">{job.filename}</span>
                                  {job.vaultId && <span className="text-muted-foreground text-xs">From vault</span>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-foreground">{job.engine}</TableCell>
                            <TableCell>{getStatusBadge(job.status)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="text-foreground text-sm">
                                  {job.chunksCompleted ?? 0}/{job.chunkCount ?? 0} chunks
                                </span>
                                {job.pageCount > 0 && (
                                  <span className="text-muted-foreground text-xs">{job.pageCount} pages</span>
                                )}
                              </div>
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
            </TabsContent>

            <TabsContent value="active" className="mt-0 flex-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Active Jobs</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Jobs currently pending or processing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {jobs.filter((j: any) => j.status === "pending" || j.status === "processing").length} active job(s)
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed" className="mt-0 flex-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Completed Jobs</CardTitle>
                  <CardDescription className="text-muted-foreground">Successfully processed documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{stats.completed} completed job(s)</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Submit OCR Dialog */}
      <SubmitOCRDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog} onSuccess={mutate} />
    </div>
  );
}
