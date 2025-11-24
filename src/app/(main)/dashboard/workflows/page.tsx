"use client";

import { useState } from "react";
import { VaultSelector } from "./_components/vault-selector";
import { DocumentSelector } from "./_components/document-selector";
import { WorkflowSelector, Workflow } from "./_components/workflow-selector";
import { WorkflowOutput } from "./_components/workflow-output";
import { VaultObject } from "@/lib/hooks/use-vault-objects-multi";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WorkflowsPage() {
  const [selectedVaultIds, setSelectedVaultIds] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<VaultObject[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runMode, setRunMode] = useState<"combined" | "separate">("separate");

  console.log("Current results count:", results.length);

  const handleVaultToggle = (vaultId: string) => {
    setSelectedVaultIds((prev) => {
      const isSelected = prev.includes(vaultId);
      if (isSelected) {
        // Remove vault and filter out its documents
        const newVaults = prev.filter((id) => id !== vaultId);
        // We need to filter out docs from this vault. 
        // Since we don't store vaultId on selectedDocs (Wait, VaultObject has vaultId), we can do it.
        setSelectedDocuments((docs) => docs.filter((d) => d.vaultId !== vaultId));
        return newVaults;
      } else {
        return [...prev, vaultId];
      }
    });
  };

  const handleDocumentToggle = (docId: string, doc: VaultObject) => {
    setSelectedDocuments((prev) => {
      const exists = prev.find((d) => d.id === docId);
      if (exists) {
        return prev.filter((d) => d.id !== docId);
      } else {
        return [...prev, doc];
      }
    });
  };

  const handleRunWorkflow = async () => {
    if (!selectedWorkflow || selectedDocuments.length === 0) return;

    console.log("Running workflow:", selectedWorkflow);
    console.log("Workflow ID:", selectedWorkflow.id);
    console.log("Run mode:", runMode);

    setIsRunning(true);

    try {
      if (runMode === "combined") {
        // Combined Execution
        const response = await fetch(`/api/workflows/${selectedWorkflow.id}/execute-combined`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documents: selectedDocuments.map(doc => ({
              id: doc.id,
              vaultId: doc.vaultId,
              name: doc.name
            })),
            // Optional: pass variables/options
          }),
        });

        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || "Combined execution failed");

        setResults(prev => [{
          ...result,
          document_name: `Combined (${selectedDocuments.length} files)`,
          workflow_name: selectedWorkflow.name
        }, ...prev]);
        
        toast.success(`Workflow completed on ${selectedDocuments.length} combined documents`);

      } else {
        // Separate Execution - Fetch text for each document first
        const promises = selectedDocuments.map(async (doc) => {
          try {
            // 1. Fetch document text
            const textResponse = await fetch(`/api/vaults/${doc.vaultId}/objects/${doc.id}/text`);
            
            if (!textResponse.ok) {
              const textError = await textResponse.json().catch(() => ({}));
              throw new Error(textError.error || `Failed to fetch text for ${doc.name}`);
            }
            
            const { text } = await textResponse.json();
            
            // 2. Execute workflow with text
            const response = await fetch(`/api/workflows/${selectedWorkflow.id}/execute`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                input: {
                  text: text
                },
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorMsg = errorData.error || `Execution failed: ${response.status}`;
              console.error(`Error executing workflow on ${doc.name}:`, errorMsg);
              throw new Error(errorMsg);
            }
            
            const result = await response.json();
            return {
              ...result,
              document_name: doc.name
            };
          } catch (error) {
            console.error(`Error processing ${doc.name}:`, error);
            const errorMessage = error instanceof Error ? error.message : "Failed to execute workflow";
            return {
              id: `error-${doc.id}-${Date.now()}`,
              workflow_name: selectedWorkflow.name,
              document_name: doc.name,
              status: "failed",
              output: { format: "text", data: errorMessage },
              created_at: new Date().toISOString(),
            };
          }
        });

        const batchResults = await Promise.all(promises);
        console.log("Batch results:", batchResults);
        setResults((prev) => {
          const newResults = [...batchResults, ...prev];
          console.log("Updated results array:", newResults);
          return newResults;
        });
        toast.success(`Workflow completed on ${batchResults.length} documents`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Workflow execution failed");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <div className="p-6 space-y-6 h-full flex flex-col">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Workflows</h2>
            <p className="text-muted-foreground">
              Automate document processing using AI workflows.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[500px] shrink-0">
          <VaultSelector
            selectedVaultIds={selectedVaultIds}
            onVaultToggle={handleVaultToggle}
          />
          <DocumentSelector
            selectedVaultIds={selectedVaultIds}
            selectedDocumentIds={selectedDocuments.map(d => d.id)}
            onDocumentToggle={handleDocumentToggle}
            runMode={runMode}
            onRunModeChange={setRunMode}
          />
          <WorkflowSelector
            selectedWorkflow={selectedWorkflow}
            onWorkflowSelect={setSelectedWorkflow}
            onRunWorkflow={handleRunWorkflow}
            canRun={selectedDocuments.length > 0 && !!selectedWorkflow}
            isRunning={isRunning}
          />
        </div>

        <Separator />

        <div className="flex-1 min-h-0">
          <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Results</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0 relative">
              <ScrollArea className="absolute inset-0">
                <div className="p-6">
                  <WorkflowOutput results={results} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

