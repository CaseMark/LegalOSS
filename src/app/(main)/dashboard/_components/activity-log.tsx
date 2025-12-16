"use client";

import { useMemo } from "react";

import Link from "next/link";

import { FileText, ScanText, Mic, Clock, CheckCircle, XCircle, ArrowUpRight, LucideIcon } from "lucide-react";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Job {
  id: string;
  filename?: string;
  status: string;
  createdAt: string;
}

interface Vault {
  id: string;
  name: string;
  createdAt?: string;
  created_at?: string;
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export function ActivityLog() {
  const { data: ocrData } = useSWR("/api/ocr", fetcher, { refreshInterval: 5000 });
  const { data: transcriptionData } = useSWR("/api/transcription", fetcher, { refreshInterval: 5000 });
  const { data: vaultsData } = useSWR("/api/vaults", fetcher);

  // Use useMemo instead of useState + useEffect to derive activities
  const activities = useMemo(() => {
    const ocrJobsRaw = ocrData?.jobs as Job[] | undefined;
    const ocrJobs = (ocrJobsRaw ?? []).map((job) => ({
      id: job.id,
      type: "ocr" as const,
      title: job.filename ?? "OCR Job",
      status: job.status,
      createdAt: new Date(job.createdAt),
      link: `/dashboard/ocr`,
    }));

    const transcriptionJobsRaw = transcriptionData?.jobs as Job[] | undefined;
    const transcriptionJobs = (transcriptionJobsRaw ?? []).map((job) => ({
      id: job.id,
      type: "transcription" as const,
      title: job.filename ?? "Transcription Job",
      status: job.status,
      createdAt: new Date(job.createdAt),
      link: `/dashboard/transcription`,
    }));

    const vaultsRaw = vaultsData?.vaults as Vault[] | undefined;
    const vaults = (vaultsRaw ?? []).map((vault) => ({
      id: vault.id,
      type: "vault" as const,
      title: `Vault: ${vault.name}`,
      status: "active",
      createdAt: new Date(vault.createdAt ?? vault.created_at ?? "2024-01-01"),
      link: `/dashboard/vaults`,
    }));

    // Combine and sort by date (most recent first)
    return [...ocrJobs, ...transcriptionJobs, ...vaults]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20); // Show last 20 activities
  }, [ocrData, transcriptionData, vaultsData]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ocr":
        return <ScanText className="size-4" />;
      case "transcription":
        return <Mic className="size-4" />;
      case "vault":
        return <FileText className="size-4" />;
      default:
        return <FileText className="size-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: BadgeVariant; icon: LucideIcon }> = {
      completed: { variant: "default", icon: CheckCircle },
      processing: { variant: "secondary", icon: Clock },
      pending: { variant: "outline", icon: Clock },
      queued: { variant: "outline", icon: Clock },
      failed: { variant: "destructive", icon: XCircle },
      error: { variant: "destructive", icon: XCircle },
      active: { variant: "secondary", icon: CheckCircle },
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

  const formatDate = (date: Date) => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Recent Activity</CardTitle>
        <CardDescription className="text-muted-foreground">
          Audit log of all jobs and operations across your Case.dev services
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
            No activity yet. Start by uploading files to a vault or running an OCR job.
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Activity</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Created</TableHead>
                  <TableHead className="text-muted-foreground w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-muted-foreground">{getTypeIcon(activity.type)}</div>
                        <span className="text-foreground text-sm capitalize">{activity.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-foreground font-medium">{activity.title}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(activity.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(activity.createdAt)}</TableCell>
                    <TableCell>
                      {activity.link && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={activity.link}>
                            <ArrowUpRight className="size-4" />
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
