"use client";

import { useState, useMemo, useEffect } from "react";

import Link from "next/link";

import { Table2, Plus, Clock, FileText, Filter, X, Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Analysis {
  id: string;
  name: string;
  status: string;
  documentIds: string[];
  columns: { name: string; type: string }[];
  createdAt: Date;
  caseId: string | null;
  caseName: string | null;
  vaultId: string | null;
}

interface Vault {
  id: string;
  name: string;
}

interface TablesClientProps {
  analyses: Analysis[];
}

export function TablesClient({ analyses }: TablesClientProps) {
  const [filterCaseId, setFilterCaseId] = useState<string | null>(null);
  const [filterVaultId, setFilterVaultId] = useState<string | null>(null);
  const [vaults, setVaults] = useState<Vault[]>([]);

  // Fetch vaults on mount
  useEffect(() => {
    fetch("/api/vaults")
      .then((res) => res.json())
      .then((data) => setVaults(data.vaults || []))
      .catch(console.error);
  }, []);

  // Filter analyses by selected case and vault
  const filteredAnalyses = useMemo(() => {
    let result = analyses;
    if (filterCaseId) {
      result = result.filter((a) => a.caseId === filterCaseId);
    }
    if (filterVaultId) {
      result = result.filter((a) => a.vaultId === filterVaultId);
    }
    return result;
  }, [analyses, filterCaseId, filterVaultId]);

  // Get unique cases from analyses for the filter dropdown
  const casesWithAnalyses = useMemo(() => {
    const caseMap = new Map<string, string>();
    analyses.forEach((a) => {
      if (a.caseId && a.caseName) {
        caseMap.set(a.caseId, a.caseName);
      }
    });
    return Array.from(caseMap.entries()).map(([id, name]) => ({ id, name }));
  }, [analyses]);

  // Get vault name for display
  const getVaultName = (vaultId: string | null) => {
    if (!vaultId) return null;
    return vaults.find((v) => v.id === vaultId)?.name || vaultId.slice(0, 8) + "...";
  };

  const selectedCaseName = filterCaseId ? casesWithAnalyses.find((c) => c.id === filterCaseId)?.name : null;
  const selectedVaultName = filterVaultId ? getVaultName(filterVaultId) : null;
  const hasFilters = filterCaseId || filterVaultId;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 overflow-auto p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold">
            <Table2 className="h-6 w-6" />
            Table Analysis
          </h1>
          <p className="text-muted-foreground mt-2">Extract structured data from your documents</p>
        </div>
        <Link
          href="/dashboard/tables/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Table
        </Link>
      </div>

      {/* Filters */}
      {analyses.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" />
            <span>Filter:</span>
          </div>

          {/* Vault Filter */}
          <Select value={filterVaultId || "all"} onValueChange={(v) => setFilterVaultId(v === "all" ? null : v)}>
            <SelectTrigger className="w-[180px]">
              <Database className="mr-2 h-4 w-4 opacity-50" />
              <SelectValue placeholder="All vaults" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vaults</SelectItem>
              {vaults.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Case Filter */}
          {casesWithAnalyses.length > 0 && (
            <Select value={filterCaseId || "all"} onValueChange={(v) => setFilterCaseId(v === "all" ? null : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All cases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cases</SelectItem>
                {casesWithAnalyses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterCaseId(null);
                setFilterVaultId(null);
              }}
              className="text-muted-foreground hover:text-foreground h-8 px-2"
            >
              <X className="mr-1 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      {filteredAnalyses.length === 0 ? (
        <div className="border-border bg-card rounded-xl border p-12 text-center">
          <Table2 className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          {hasFilters ? (
            <>
              <h2 className="mb-2 text-lg font-medium">No tables match your filters</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                {filterVaultId && selectedVaultName && `Vault: "${selectedVaultName}"`}
                {filterVaultId && filterCaseId && " • "}
                {filterCaseId && selectedCaseName && `Case: "${selectedCaseName}"`}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setFilterCaseId(null);
                  setFilterVaultId(null);
                }}
              >
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <h2 className="mb-2 text-lg font-medium">No tables yet</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Create a table to start extracting data from your documents.
              </p>
              <Link
                href="/dashboard/tables/new"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create your first table
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAnalyses.map((analysis) => (
            <Link
              key={analysis.id}
              href={`/dashboard/tables/${analysis.id}`}
              className="border-border hover:border-primary/50 hover:bg-muted/30 bg-card block rounded-xl border p-5 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-medium">{analysis.name}</h3>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-2 text-sm">
                    {analysis.vaultId && (
                      <span className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {getVaultName(analysis.vaultId)}
                      </span>
                    )}
                    {analysis.vaultId && analysis.caseName && <span>•</span>}
                    {analysis.caseName || (!analysis.vaultId && "No vault")}
                  </p>
                </div>
                <StatusBadge status={analysis.status} />
              </div>
              <div className="text-muted-foreground mt-4 flex items-center gap-5 text-sm">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  {analysis.documentIds.length} documents
                </span>
                <span className="flex items-center gap-1.5">
                  <Table2 className="h-4 w-4" />
                  {analysis.columns.length} columns
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {new Date(analysis.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Results count */}
      {hasFilters && filteredAnalyses.length > 0 && (
        <p className="text-muted-foreground mt-4 text-center text-sm">
          Showing {filteredAnalyses.length} of {analyses.length} tables
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", label: "Draft" },
    processing: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-300",
      label: "Processing",
    },
    completed: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-300",
      label: "Complete",
    },
    failed: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "Failed" },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>{config.label}</span>;
}
