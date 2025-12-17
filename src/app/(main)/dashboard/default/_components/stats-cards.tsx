"use client";

import { FolderLock, ScanText, Mic, Volume2, MessageSquare, TrendingUp } from "lucide-react";
import useSWR from "swr";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function StatsCards() {
  const { data: vaultsData } = useSWR("/api/vaults", fetcher);
  const { data: ocrData } = useSWR("/api/ocr", fetcher);
  const { data: transcriptionData } = useSWR("/api/transcription", fetcher);

  const vaults = vaultsData?.vaults || [];
  const ocrJobs = ocrData?.jobs || [];
  const transcriptionJobs = transcriptionData?.jobs || [];

  const totalDocuments = vaults.reduce((sum: number, v: any) => sum + (v.objectCount || 0), 0);
  const completedOCR = ocrJobs.filter((j: any) => j.status === "completed").length;
  const completedTranscriptions = transcriptionJobs.filter((j: any) => j.status === "completed").length;
  const activeJobs =
    ocrJobs.filter((j: any) => j.status === "processing" || j.status === "pending").length +
    transcriptionJobs.filter((j: any) => j.status === "processing" || j.status === "queued").length;

  const stats = [
    {
      title: "Vaults",
      value: vaults.length,
      description: "Secure document storage",
      icon: FolderLock,
      trend: totalDocuments > 0 ? `${totalDocuments} documents` : "No documents yet",
    },
    {
      title: "OCR Jobs",
      value: ocrJobs.length,
      description: "Document text extraction",
      icon: ScanText,
      trend: `${completedOCR} completed`,
    },
    {
      title: "Transcriptions",
      value: transcriptionJobs.length,
      description: "Audio-to-text conversion",
      icon: Mic,
      trend: `${completedTranscriptions} completed`,
    },
    {
      title: "Active Jobs",
      value: activeJobs,
      description: "Currently processing",
      icon: TrendingUp,
      trend: activeJobs > 0 ? "In progress..." : "All clear",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-foreground text-sm font-medium">{stat.title}</CardTitle>
              <Icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground text-2xl font-bold">{stat.value}</div>
              <p className="text-muted-foreground mt-1 text-xs">{stat.trend}</p>
              <p className="text-muted-foreground text-xs opacity-70">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
