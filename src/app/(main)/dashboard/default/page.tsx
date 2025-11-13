"use client";

import { useEffect, useState } from "react";
import { FolderLock, ScanText, Mic, FileText } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityLog } from "../_components/activity-log";
import { StatsCards } from "../_components/stats-cards";

export default function DashboardPage() {
  return (
    <div className="@container/main flex flex-col gap-4 p-6 md:gap-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your Legal AI workspace. Monitor your document processing, transcription, and AI usage.
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Activity Log */}
      <ActivityLog />
    </div>
  );
}
