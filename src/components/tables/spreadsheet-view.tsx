"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import Link from "next/link";

import {
  Plus,
  Play,
  Trash,
  Spinner,
  Check,
  X,
  Pencil,
  File,
  Lightning,
  CheckCircle,
  Warning,
  Flag,
  ArrowLeft,
} from "@phosphor-icons/react";

import { ModelSelector } from "@/components/model-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ExtractionColumn, CellValue } from "@/db/schema";

// Simplified props type to avoid complex type intersections with DB schema
interface AnalysisData {
  id: string;
  name: string;
  status: string;
  modelId: string | null;
  vaultId: string | null;
  documentIds: string[];
  columns: ExtractionColumn[];
  documents: Array<{ id: string; title: string }>;
  rows: Array<{
    id: string;
    documentId: string;
    documentTitle: string;
    data: Record<string, CellValue>;
    tokensUsed?: number | null;
    extractedAt?: Date | null;
  }>;
  matter: { id: string; name: string } | null;
}

interface SpreadsheetViewProps {
  analysis: AnalysisData;
}

interface CellStatus {
  documentId: string;
  columnId: string;
  status: "idle" | "extracting" | "complete" | "error";
  message?: string;
}

interface ExpandedCell {
  documentId: string;
  columnId: string;
  value: CellValue;
  columnName: string;
  documentTitle: string;
}

export function SpreadsheetView({ analysis: initialAnalysis }: SpreadsheetViewProps) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [isRunning, setIsRunning] = useState(false);
  const [cellStatuses, setCellStatuses] = useState<Map<string, CellStatus>>(new Map());
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [defaultModel, setDefaultModel] = useState(initialAnalysis.modelId || "anthropic/claude-sonnet-4.5");
  const [expandedCell, setExpandedCell] = useState<ExpandedCell | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update default model
  const handleDefaultModelChange = async (modelId: string) => {
    setDefaultModel(modelId);
    await fetch(`/api/tabular-analysis/${analysis.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId }),
    });
    setAnalysis((prev) => ({ ...prev, modelId }));
  };

  // Sort columns by order
  const sortedColumns = [...analysis.columns].sort((a, b) => a.order - b.order);

  // Get cell value for a document/column
  const getCellValue = useCallback(
    (documentId: string, columnId: string): CellValue | null => {
      const row = analysis.rows.find((r) => r.documentId === documentId);
      if (!row?.data) return null;
      return row.data[columnId] || null;
    },
    [analysis.rows],
  );

  // Get cell status key
  const getCellKey = (documentId: string, columnId: string) => `${documentId}:${columnId}`;

  // Count completed cells for a document
  const getCompletedCellCount = (documentId: string): { completed: number; total: number } => {
    const total = sortedColumns.length;
    let completed = 0;
    for (const col of sortedColumns) {
      const value = getCellValue(documentId, col.id);
      if (value && value.value !== null) {
        completed++;
      }
    }
    return { completed, total };
  };

  // Toggle row selection
  const toggleRowSelection = (documentId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(documentId)) {
        next.delete(documentId);
      } else {
        next.add(documentId);
      }
      return next;
    });
  };

  // Toggle all rows
  const toggleAllRows = () => {
    if (selectedRows.size === analysis.documents.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(analysis.documents.map((d) => d.id)));
    }
  };

  // Add a new column
  const handleAddColumn = async () => {
    const newColumn: ExtractionColumn = {
      id: crypto.randomUUID(),
      name: "New Column",
      prompt: "",
      dataType: "text",
      order: analysis.columns.length,
    };

    const updatedColumns = [...analysis.columns, newColumn];

    const response = await fetch(`/api/tabular-analysis/${analysis.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: updatedColumns }),
    });

    if (response.ok) {
      setAnalysis((prev) => ({ ...prev, columns: updatedColumns }));
      setEditingColumn(newColumn.id);
    }
  };

  // Update a column
  const handleUpdateColumn = async (columnId: string, updates: Partial<ExtractionColumn>) => {
    const updatedColumns = analysis.columns.map((col) => (col.id === columnId ? { ...col, ...updates } : col));

    const response = await fetch(`/api/tabular-analysis/${analysis.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: updatedColumns }),
    });

    if (response.ok) {
      setAnalysis((prev) => ({ ...prev, columns: updatedColumns }));
    }
  };

  // Delete a column
  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm("Delete this column and all its data?")) return;

    const updatedColumns = analysis.columns
      .filter((col) => col.id !== columnId)
      .map((col, idx) => ({ ...col, order: idx }));

    const response = await fetch(`/api/tabular-analysis/${analysis.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns: updatedColumns }),
    });

    if (response.ok) {
      setAnalysis((prev) => ({
        ...prev,
        columns: updatedColumns,
        rows: prev.rows.map((row) => ({
          ...row,
          data: Object.fromEntries(Object.entries(row.data).filter(([key]) => key !== columnId)),
        })),
      }));
    }
  };

  // Poll for analysis updates
  const pollForUpdates = useCallback(async () => {
    try {
      const response = await fetch(`/api/tabular-analysis/${analysis.id}`);
      if (response.ok) {
        const data = await response.json();

        console.log("[SpreadsheetView] Poll result:", {
          status: data.status,
          rowCount: data.rows?.length,
          rows: data.rows,
        });

        // Update rows with new data
        setAnalysis((prev) => ({
          ...prev,
          status: data.status,
          rows: data.rows || prev.rows,
        }));

        // Calculate progress
        const totalCells = analysis.documents.length * sortedColumns.length;
        let completedCells = 0;
        for (const row of data.rows || []) {
          completedCells += Object.keys(row.data || {}).length;
        }
        setProgress(totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0);

        // Return whether we should continue polling
        // Continue polling while status is 'draft' or 'processing'
        // Stop when status is 'completed' or 'failed'
        return data.status === "draft" || data.status === "processing";
      }
    } catch (error) {
      console.error("Failed to poll for updates:", error);
    }
    return false;
  }, [analysis.id, analysis.documents.length, sortedColumns.length]);

  // Run extraction using durable workflow
  const handleRun = async () => {
    if (analysis.columns.length === 0) {
      alert("Add at least one column before running extraction");
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setCellStatuses(new Map());

    try {
      // Start the durable workflow
      const response = await fetch(`/api/tabular-analysis/${analysis.id}/run-workflow`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to start extraction");
        setIsRunning(false);
        return;
      }

      // Do an initial poll immediately
      await pollForUpdates();

      // Poll for updates until complete
      const pollInterval = setInterval(async () => {
        const shouldContinue = await pollForUpdates();
        if (!shouldContinue) {
          clearInterval(pollInterval);
          // Final fetch to ensure we have latest data
          await pollForUpdates();
          setIsRunning(false);
          setProgress(100);
        }
      }, 2000); // Poll every 2 seconds

      // Store interval ref for cleanup
      pollingIntervalRef.current = pollInterval;
    } catch (error) {
      console.error("Failed to start workflow:", error);
      alert("Failed to start extraction workflow");
      setIsRunning(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Check if already processing on mount
  useEffect(() => {
    if (initialAnalysis.status === "processing") {
      setIsRunning(true);
      const pollInterval = setInterval(async () => {
        const shouldContinue = await pollForUpdates();
        if (!shouldContinue) {
          clearInterval(pollInterval);
          setIsRunning(false);
          setProgress(100);
        }
      }, 2000);
      pollingIntervalRef.current = pollInterval;
    }
  }, [initialAnalysis.status, pollForUpdates]);

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Header */}
      <div className="bg-card flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/tables">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{analysis.name}</h1>
            <p className="text-muted-foreground text-sm">
              {analysis.documents.length} documents · {analysis.columns.length} columns
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <div className="text-muted-foreground bg-muted flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
              <Spinner className="h-4 w-4 animate-spin" />
              <span>{progress}% complete</span>
            </div>
          )}
          {/* Default Model Selector */}
          <ModelSelector value={defaultModel} onValueChange={handleDefaultModelChange} />
          <Button onClick={handleAddColumn} variant="outline" size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Column
          </Button>
          <Button
            onClick={handleRun}
            disabled={isRunning || analysis.columns.length === 0}
            size="sm"
            className="bg-primary"
          >
            <Play className="mr-1.5 h-4 w-4" weight="fill" />
            Run Extraction
          </Button>
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/80 sticky top-0 z-10 backdrop-blur-sm">
            <tr className="border-b">
              {/* Checkbox column */}
              <th className="w-10 border-r p-3">
                <input
                  type="checkbox"
                  checked={selectedRows.size === analysis.documents.length && analysis.documents.length > 0}
                  onChange={toggleAllRows}
                  className="border-border rounded"
                />
              </th>
              {/* Row number column */}
              <th className="text-muted-foreground w-12 border-r p-3 font-normal" />
              {/* File column */}
              <th className="bg-muted/80 sticky left-0 w-[200px] max-w-[200px] min-w-[200px] border-r p-3 text-left font-medium backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <File className="text-muted-foreground h-4 w-4" />
                  <span>File</span>
                </div>
              </th>
              {/* Verification Status column */}
              <th className="w-[100px] max-w-[100px] min-w-[100px] border-r p-3 text-left font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-muted-foreground h-4 w-4" />
                  <span>Verification Status</span>
                </div>
              </th>
              {/* Data columns */}
              {sortedColumns.map((column) => (
                <th key={column.id} className="min-w-[400px] border-r p-3 text-left font-medium">
                  {editingColumn === column.id ? (
                    <ColumnEditor
                      column={column}
                      onSave={(updates) => {
                        handleUpdateColumn(column.id, updates);
                        setEditingColumn(null);
                      }}
                      onCancel={() => setEditingColumn(null)}
                      onDelete={() => handleDeleteColumn(column.id)}
                      defaultModel={defaultModel}
                    />
                  ) : (
                    <div className="group flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">T</span>
                        <div>
                          <div className="font-medium">{column.name}</div>
                          {column.prompt && (
                            <div className="text-muted-foreground max-w-[180px] truncate text-xs font-normal">
                              {column.prompt}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => setEditingColumn(column.id)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </th>
              ))}
              {/* Add column button */}
              <th className="w-12 p-3">
                <Button variant="ghost" size="sm" onClick={handleAddColumn} className="h-6 w-6 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {analysis.documents.map((doc, idx) => {
              const { completed, total } = getCompletedCellCount(doc.id);
              const isSelected = selectedRows.has(doc.id);
              const hasProcessing = Array.from(cellStatuses.values()).some(
                (s) => s.documentId === doc.id && s.status === "extracting",
              );

              return (
                <tr key={doc.id} className={`hover:bg-muted/30 border-b ${isSelected ? "bg-primary/5" : ""}`}>
                  {/* Checkbox */}
                  <td className="border-r p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRowSelection(doc.id)}
                      className="border-border rounded"
                    />
                  </td>
                  {/* Row number */}
                  <td className="text-muted-foreground border-r p-3 text-center">{idx + 1}</td>
                  {/* File name */}
                  <td className="bg-background sticky left-0 border-r p-3">
                    <div className="flex items-center gap-2">
                      {hasProcessing ? (
                        <Lightning className="h-4 w-4 text-amber-500" weight="fill" />
                      ) : (
                        <File className="h-4 w-4 text-red-500" weight="fill" />
                      )}
                      <span className="max-w-[160px] truncate font-medium">{doc.title}</span>
                    </div>
                  </td>
                  {/* Verification Status */}
                  <td className="border-r p-3">
                    <VerificationBadge completed={completed} total={total} />
                  </td>
                  {/* Data cells */}
                  {sortedColumns.map((column) => {
                    const cellValue = getCellValue(doc.id, column.id);
                    const status = cellStatuses.get(getCellKey(doc.id, column.id));

                    return (
                      <td
                        key={column.id}
                        className="hover:bg-muted/50 relative cursor-pointer border-r p-3"
                        onClick={() => {
                          if (cellValue && cellValue.value !== null) {
                            setExpandedCell({
                              documentId: doc.id,
                              columnId: column.id,
                              value: cellValue,
                              columnName: column.name,
                              documentTitle: doc.title,
                            });
                          }
                        }}
                      >
                        <CellDisplay value={cellValue} status={status} dataType={column.dataType} />
                      </td>
                    );
                  })}
                  <td className="w-12" />
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty state */}
        {analysis.documents.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-20">
            <File className="mb-4 h-12 w-12" />
            <p>No documents in this analysis</p>
          </div>
        )}
      </div>

      {/* Cell Expansion Modal */}
      {expandedCell && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setExpandedCell(null)}
        >
          <div
            className="bg-background mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h3 className="font-semibold">{expandedCell.columnName}</h3>
                <p className="text-muted-foreground text-sm">{expandedCell.documentTitle}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setExpandedCell(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Content */}
            <div className="flex-1 space-y-4 overflow-auto p-4">
              {/* Extracted Value */}
              <div>
                <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                  Extracted Value
                </h4>
                <div className="prose prose-sm dark:prose-invert bg-muted/30 max-w-none rounded-lg p-3">
                  {String(expandedCell.value.value)}
                </div>
              </div>

              {/* Reasoning */}
              {expandedCell.value.reasoning && (
                <div>
                  <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">Reasoning</h4>
                  <div className="text-muted-foreground bg-muted/20 rounded-lg p-3 text-sm">
                    {expandedCell.value.reasoning}
                  </div>
                </div>
              )}

              {/* Tool History / Steps - Not supported in LegalOSS */}

              {/* Metadata */}
              <div className="space-y-2 border-t pt-4">
                {expandedCell.value.confidence !== undefined && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <span>Confidence:</span>
                    <span className={expandedCell.value.confidence >= 0.7 ? "text-green-600" : "text-amber-600"}>
                      {Math.round(expandedCell.value.confidence * 100)}%
                    </span>
                  </div>
                )}
                {expandedCell.value.sources && expandedCell.value.sources.length > 0 && (
                  <div className="text-muted-foreground text-sm">
                    <span>Sources: </span>
                    <span>{expandedCell.value.sources.join(", ")}</span>
                  </div>
                )}
                {expandedCell.value.tokensUsed !== undefined && expandedCell.value.tokensUsed > 0 && (
                  <div className="text-muted-foreground text-sm">
                    <span>Tokens used: </span>
                    <span>{expandedCell.value.tokensUsed.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Verification badge component
function VerificationBadge({ completed, total }: { completed: number; total: number }) {
  if (total === 0) return <span className="text-muted-foreground">No columns</span>;

  const percentage = completed / total;
  let bgColor = "bg-gray-100 text-gray-700";
  let icon = null;

  if (percentage === 1) {
    bgColor = "bg-green-100 text-green-700";
    icon = <CheckCircle className="h-3.5 w-3.5" weight="fill" />;
  } else if (percentage >= 0.5) {
    bgColor = "bg-amber-100 text-amber-700";
    icon = <Warning className="h-3.5 w-3.5" weight="fill" />;
  } else if (percentage > 0) {
    bgColor = "bg-orange-100 text-orange-700";
    icon = <Warning className="h-3.5 w-3.5" />;
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${bgColor}`}>
      {icon}
      <span>
        {completed}/{total} cells
      </span>
    </div>
  );
}

// Column editor component
function ColumnEditor({
  column,
  onSave,
  onCancel,
  onDelete,
  defaultModel,
}: {
  column: ExtractionColumn;
  onSave: (updates: Partial<ExtractionColumn>) => void;
  onCancel: () => void;
  onDelete: () => void;
  defaultModel: string;
}) {
  const [name, setName] = useState(column.name);
  const [prompt, setPrompt] = useState(column.prompt);
  const [modelId, setModelId] = useState(column.modelId || defaultModel);
  const [useOverride, setUseOverride] = useState(!!column.modelId);

  return (
    <div className="bg-background min-w-[320px] space-y-3 rounded-lg border p-3 shadow-lg">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Column name" className="h-9 text-sm" />
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Extraction prompt (e.g., 'Extract the contract date')"
        className="min-h-[80px] resize-none text-sm"
      />
      {/* Per-column model override */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useOverride"
            checked={useOverride}
            onChange={(e) => setUseOverride(e.target.checked)}
            className="border-border rounded"
          />
          <label htmlFor="useOverride" className="text-muted-foreground text-xs">
            Use different model for this column
          </label>
        </div>
        {useOverride && <ModelSelector value={modelId} onValueChange={setModelId} />}
      </div>
      <div className="flex justify-between pt-1">
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash className="h-3.5 w-3.5" />
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave({ name, prompt, modelId: useOverride ? modelId : undefined })}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// Cell display component
function CellDisplay({
  value,
  status,
  dataType,
}: {
  value: CellValue | null;
  status?: CellStatus;
  dataType: ExtractionColumn["dataType"];
}) {
  // Show loading state
  if (status?.status === "extracting") {
    return (
      <div className="text-muted-foreground flex items-center gap-2">
        <span className="text-amber-600 italic">Generating output...</span>
        <Spinner className="h-3 w-3 animate-spin text-amber-600" />
      </div>
    );
  }

  // Show error state
  if (status?.status === "error" || value?.error) {
    return (
      <div className="text-destructive flex items-center gap-2 text-sm">
        <Warning className="h-4 w-4" />
        <span className="truncate">{value?.error || status?.message || "Error"}</span>
      </div>
    );
  }

  // No value yet
  if (!value || value.value === null) {
    return <span className="text-muted-foreground">No information</span>;
  }

  // Display based on data type
  switch (dataType) {
    case "boolean":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${
            value.value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {value.value ? (
            <>
              <Check className="h-3 w-3" /> Yes
            </>
          ) : (
            <>
              <X className="h-3 w-3" /> No
            </>
          )}
        </span>
      );

    case "number":
      return (
        <span className="font-mono">
          {typeof value.value === "number" ? value.value.toLocaleString() : value.value}
        </span>
      );

    case "date":
      return <span>{String(value.value)}</span>;

    default:
      return (
        <div className="group relative">
          <div className="line-clamp-2">{String(value.value)}</div>
          {value.confidence !== undefined && value.confidence < 0.7 && (
            <Flag className="absolute -top-1 -right-1 h-3 w-3 text-red-500" weight="fill" />
          )}
        </div>
      );
  }
}
