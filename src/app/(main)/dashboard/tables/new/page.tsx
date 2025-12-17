"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Table2, FileText, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface VaultObject {
  id: string;
  filename: string;
  status: string;
}

interface Vault {
  id: string;
  name: string;
}

export default function NewTablePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<VaultObject[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Load vaults on mount
  useEffect(() => {
    fetch("/api/vaults")
      .then((res) => res.json())
      .then((data) => {
        setVaults(data.vaults || []);
      })
      .catch(console.error);
  }, []);

  // Load documents when vault is selected
  useEffect(() => {
    if (!selectedVaultId) {
      setDocuments([]);
      return;
    }

    setIsLoading(true);
    fetch(`/api/vaults/${selectedVaultId}/objects`)
      .then((res) => res.json())
      .then((data) => {
        setDocuments(data.objects || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [selectedVaultId]);

  const toggleDocument = (docId: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedDocs(new Set(documents.map((d) => d.id)));
  };

  const deselectAll = () => {
    setSelectedDocs(new Set());
  };

  const handleCreate = async () => {
    if (!selectedVaultId || selectedDocs.size === 0 || !name.trim()) {
      alert("Please select a vault, documents, and provide a name");
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/tabular-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultId: selectedVaultId,
          name: name.trim(),
          description: description.trim() || undefined,
          documentIds: Array.from(selectedDocs),
          columns: [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create table");
      }

      const { analysisId } = await response.json();
      router.push(`/dashboard/tables/${analysisId}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create table");
      setIsCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/tables"
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tables
        </Link>
        <h1 className="flex items-center gap-3 text-2xl font-semibold">
          <Table2 className="h-6 w-6" />
          Create New Table
        </h1>
        <p className="text-muted-foreground mt-2">Select documents from a vault and create extraction columns</p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Table Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Table Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Medical Records Summary" />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Description (optional)</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this table for?"
            rows={2}
          />
        </div>

        {/* Vault Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Vault</label>
          <Select value={selectedVaultId || ""} onValueChange={setSelectedVaultId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a vault..." />
            </SelectTrigger>
            <SelectContent>
              {vaults.map((vault) => (
                <SelectItem key={vault.id} value={vault.id}>
                  {vault.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Document Selection */}
        {selectedVaultId && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Select Documents
                {selectedDocs.size > 0 && (
                  <span className="text-muted-foreground ml-2">({selectedDocs.size} selected)</span>
                )}
              </label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll} className="h-7 text-xs">
                  Clear
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="border-border text-muted-foreground rounded-lg border p-8 text-center">
                Loading documents...
              </div>
            ) : documents.length === 0 ? (
              <div className="border-border text-muted-foreground rounded-lg border p-8 text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 opacity-50" />
                <p>No documents in this vault.</p>
                <p className="mt-1 text-sm">Upload some documents first.</p>
              </div>
            ) : (
              <div className="border-border divide-border max-h-[300px] divide-y overflow-y-auto rounded-lg border">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => toggleDocument(doc.id)}
                    className={`hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedDocs.has(doc.id) ? "bg-primary/5" : ""
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        selectedDocs.has(doc.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {selectedDocs.has(doc.id) && <Check className="h-3 w-3" />}
                    </div>
                    <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-sm">{doc.filename}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Button */}
        <div className="pt-4">
          <Button
            onClick={handleCreate}
            disabled={!selectedVaultId || selectedDocs.size === 0 || !name.trim() || isCreating}
            className="w-full"
          >
            {isCreating ? "Creating..." : "Create Table"}
          </Button>
        </div>
      </div>
    </div>
  );
}
