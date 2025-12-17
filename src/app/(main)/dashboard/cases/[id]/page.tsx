"use client";

import { use } from "react";

import Link from "next/link";

import { ArrowLeft, Calendar, FileText, Users, CheckSquare, Brain, Plus } from "lucide-react";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DocumentsTab } from "./_components/documents-tab";
import { PartiesTab } from "./_components/parties-tab";
import { TasksTab } from "./_components/tasks-tab";
import { TimelineTab } from "./_components/timeline-tab";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, mutate } = useSWR(`/api/cases/${id}`, fetcher, {
    refreshInterval: 5000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading case...</div>
      </div>
    );
  }

  const caseData = data.case;
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="space-y-4 border-b p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/cases">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-foreground text-2xl font-bold">{caseData.title}</h1>
              <Badge variant="outline" className="font-mono">
                {caseData.caseNumber}
              </Badge>
              <Badge>{caseData.status}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">{caseData.description || "No description"}</p>
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs">Case Type</p>
            <p className="text-foreground text-sm font-medium capitalize">
              {caseData.caseType?.replace(/_/g, " ") || "-"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Court</p>
            <p className="text-foreground text-sm font-medium">{caseData.courtName || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Trial Date</p>
            <p className="text-foreground text-sm font-medium">{formatDate(caseData.trialDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Opened</p>
            <p className="text-foreground text-sm font-medium">{formatDate(caseData.dateOpened)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden p-6">
        <Tabs defaultValue="overview" className="flex h-full flex-col">
          <TabsList>
            <TabsTrigger value="overview">
              <FileText className="mr-2 size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Calendar className="mr-2 size-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="mr-2 size-4" />
              Documents ({data.documents?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <CheckSquare className="mr-2 size-4" />
              Tasks ({data.tasks?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="parties">
              <Users className="mr-2 size-4" />
              Parties ({data.parties?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 flex-1 overflow-auto">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Case Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs">Jurisdiction</p>
                      <p className="text-foreground">{caseData.jurisdiction || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs">Official Case Number</p>
                      <p className="text-foreground font-mono">{caseData.officialCaseNumber || "Not filed"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs">Estimated Value</p>
                      <p className="text-foreground">
                        {caseData.estimatedValue ? `$${caseData.estimatedValue.toLocaleString()}` : "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs">Visibility</p>
                      <Badge variant="outline" className="capitalize">
                        {caseData.visibility}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-foreground text-sm">Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-foreground text-3xl font-bold">{data.events?.length || 0}</div>
                    <p className="text-muted-foreground text-xs">Timeline entries</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-foreground text-sm">Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-foreground text-3xl font-bold">{data.documents?.length || 0}</div>
                    <p className="text-muted-foreground text-xs">Files linked</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-foreground text-sm">Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-foreground text-3xl font-bold">
                      {data.tasks?.filter((t: any) => t.status !== "completed").length || 0}
                    </div>
                    <p className="text-muted-foreground text-xs">Open tasks</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4 flex-1 overflow-auto">
            <TimelineTab caseId={id} events={data.events || []} onUpdate={mutate} />
          </TabsContent>

          <TabsContent value="documents" className="mt-4 flex-1 overflow-auto">
            <DocumentsTab caseId={id} documents={data.documents || []} onUpdate={mutate} />
          </TabsContent>

          <TabsContent value="tasks" className="mt-4 flex-1 overflow-auto">
            <TasksTab caseId={id} tasks={data.tasks || []} onUpdate={mutate} />
          </TabsContent>

          <TabsContent value="parties" className="mt-4 flex-1 overflow-auto">
            <PartiesTab caseId={id} parties={data.parties || []} onUpdate={mutate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
