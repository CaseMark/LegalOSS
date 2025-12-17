"use client";

import { useState } from "react";

import Link from "next/link";

import { Briefcase, Plus, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { CreateCaseDialog } from "./_components/create-case-dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CasesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data, isLoading, mutate } = useSWR("/api/cases", fetcher);
  const cases = data?.cases || [];

  const stats = {
    total: cases.length,
    active: cases.filter((c: any) => c.status === "active").length,
    trial: cases.filter((c: any) => c.status === "trial").length,
    closed: cases.filter((c: any) => c.status === "closed").length,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: "default",
      settlement: "secondary",
      trial: "outline",
      closed: "secondary",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

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
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Case Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage matters, track deadlines, and organize case files with AI assistance
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 size-4" />
          New Case
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 overflow-auto p-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-foreground text-sm font-medium">Total Cases</CardTitle>
              <Briefcase className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-foreground text-sm font-medium">Active</CardTitle>
              <CheckCircle className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-foreground text-sm font-medium">In Trial</CardTitle>
              <Calendar className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground text-2xl font-bold">{stats.trial}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-foreground text-sm font-medium">Closed</CardTitle>
              <AlertCircle className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground text-2xl font-bold">{stats.closed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Cases Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Cases</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground flex items-center justify-center py-12">Loading cases...</div>
            ) : cases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Briefcase className="text-muted-foreground mb-4 size-12" />
                <h3 className="text-foreground text-lg font-medium">No cases yet</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Create your first case to start organizing matters and documents
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 size-4" />
                  Create First Case
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground">Case #</TableHead>
                    <TableHead className="text-muted-foreground">Title</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Trial Date</TableHead>
                    <TableHead className="text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((caseItem: any) => (
                    <TableRow key={caseItem.id} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell className="text-foreground font-mono text-sm">{caseItem.caseNumber}</TableCell>
                      <TableCell className="text-foreground font-medium">{caseItem.title}</TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {caseItem.caseType?.replace(/_/g, " ") || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(caseItem.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(caseItem.trialDate)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/cases/${caseItem.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Case Dialog */}
      <CreateCaseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          mutate();
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}
