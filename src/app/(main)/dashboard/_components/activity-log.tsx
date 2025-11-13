"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { FileText, ScanText, Mic, Clock, CheckCircle, XCircle, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Activity {
  id: string;
  type: "ocr" | "transcription" | "vault";
  title: string;
  status: string;
  createdAt: Date;
  link?: string;
}

export function ActivityLog() {
  const [activities, setActivities] = useState<Activity[]>([]);

  const { data: ocrData } = useSWR("/api/ocr", fetcher, { refreshInterval: 5000 });
  const { data: transcriptionData } = useSWR("/api/transcription", fetcher, { refreshInterval: 5000 });
  const { data: vaultsData } = useSWR("/api/vaults", fetcher);

  useEffect(() => {
    const ocrJobs = (ocrData?.jobs || []).map((job: any) => ({
      id: job.id,
      type: "ocr" as const,
      title: job.filename || "OCR Job",
      status: job.status,
      createdAt: new Date(job.createdAt),
      link: `/dashboard/ocr`,
    }));

    const transcriptionJobs = (transcriptionData?.jobs || []).map((job: any) => ({
      id: job.id,
      type: "transcription" as const,
      title: job.filename || "Transcription Job",
      status: job.status,
      createdAt: new Date(job.createdAt),
      link: `/dashboard/transcription`,
    }));

    const vaults = (vaultsData?.vaults || []).map((vault: any) => ({
      id: vault.id,
      type: "vault" as const,
      title: `Vault: ${vault.name}`,
      status: "active",
      createdAt: new Date(vault.createdAt || vault.created_at),
      link: `/dashboard/vaults`,
    }));

    // Combine and sort by date (most recent first)
    const combined = [...ocrJobs, ...transcriptionJobs, ...vaults]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20); // Show last 20 activities

    setActivities(combined);
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
    const variants: Record<string, { variant: any; icon: any }> = {
      completed: { variant: "default", icon: CheckCircle },
      processing: { variant: "secondary", icon: Clock },
      pending: { variant: "outline", icon: Clock },
      queued: { variant: "outline", icon: Clock },
      failed: { variant: "destructive", icon: XCircle },
      error: { variant: "destructive", icon: XCircle },
      active: { variant: "secondary", icon: CheckCircle },
    };

    const config = variants[status] || variants.pending;
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
        )}
      </CardContent>
    </Card>
  );
}
