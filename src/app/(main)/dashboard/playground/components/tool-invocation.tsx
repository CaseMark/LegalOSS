import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Search, FileText, Zap, Database, FolderLock, CheckCircle2, Clock } from "lucide-react";

interface ToolInvocationProps {
  toolName: string;
  args: any;
  result?: any;
  isLoading?: boolean;
}

const toolIcons: Record<string, any> = {
  // Legacy tools
  searchVaults: Search,
  getVaultInfo: Database,
  triggerOCR: FileText,
  runWorkflow: Zap,
  // Vault filesystem
  listVaultFiles: FolderLock,
  getVaultFileInfo: FileText,
  organizeVaultsByContent: Database,
  // Case.dev API tools
  listVaults: FolderLock,
  createVault: FolderLock,
  getVault: Database,
  listVaultObjects: FileText,
  triggerIngestion: Zap,
  searchVault: Search,
  submitOCR: FileText,
  // Workflows
  searchWorkflows: Search,
  getWorkflow: Database,
  executeWorkflow: Zap,
};

const toolLabels: Record<string, string> = {
  // Legacy
  searchVaults: "Vault Search",
  getVaultInfo: "Vault Info",
  triggerOCR: "OCR Processing",
  runWorkflow: "Workflow Execution",
  // Filesystem
  listVaultFiles: "List Vault Files",
  getVaultFileInfo: "File Details",
  organizeVaultsByContent: "Organize by Content",
  // Case.dev API
  listVaults: "List All Vaults",
  createVault: "Create Vault",
  getVault: "Get Vault Details",
  listVaultObjects: "List Vault Objects",
  triggerIngestion: "Trigger Ingestion",
  searchVault: "Search Vault",
  submitOCR: "Submit OCR Job",
  // Workflows
  searchWorkflows: "Search Workflows",
  getWorkflow: "Get Workflow Details",
  executeWorkflow: "Execute Workflow",
};

export function ToolInvocation({ toolName, args, result, isLoading }: ToolInvocationProps) {
  const Icon = toolIcons[toolName] || Zap;
  const label = toolLabels[toolName] || toolName;

  return (
    <Card className="bg-muted/50 border-primary/20 p-4">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 rounded-full p-2">
          {isLoading ? (
            <Loader2 className="text-primary size-4 animate-spin" />
          ) : (
            <Icon className="text-primary size-4" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            <Badge variant={isLoading ? "secondary" : "default"} className="text-xs">
              {isLoading ? "Running..." : "Complete"}
            </Badge>
          </div>

          {/* Tool Arguments */}
          <div className="bg-background/50 rounded-md border p-3">
            <div className="text-muted-foreground mb-2 text-xs font-medium">Parameters:</div>
            <pre className="overflow-x-auto text-xs">{JSON.stringify(args, null, 2)}</pre>
          </div>

          {/* Tool Result */}
          {result && !isLoading && (
            <div className="bg-background/50 rounded-md border p-3">
              <div className="text-muted-foreground mb-2 text-xs font-medium">Result:</div>
              {renderToolResult(toolName, result)}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function renderToolResult(toolName: string, result: any) {
  // Custom rendering based on tool type
  switch (toolName) {
    case "searchVaults":
      return (
        <div className="space-y-2">
          <div className="text-sm">
            Found <span className="font-bold">{result.resultsFound}</span> results using{" "}
            <Badge variant="outline" className="text-xs">
              {result.method}
            </Badge>
          </div>
          {result.chunks && result.chunks.length > 0 && (
            <div className="space-y-2">
              {result.chunks.map((chunk: any, i: number) => (
                <div key={i} className="bg-muted/30 rounded p-2 text-xs">
                  <div className="mb-1 font-medium">{chunk.filename}</div>
                  <div className="text-muted-foreground line-clamp-2">{chunk.text}</div>
                  <div className="text-muted-foreground mt-1">
                    Score: {(chunk.score * 100).toFixed(1)}% • Chunk {chunk.chunkIndex}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "getVaultInfo":
      return (
        <div className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Name:</span> {result.name}
          </div>
          <div>
            <span className="text-muted-foreground">Objects:</span> {result.totalObjects}
          </div>
          <div>
            <span className="text-muted-foreground">Vectors:</span> {result.totalVectors}
          </div>
          <div>
            <span className="text-muted-foreground">GraphRAG:</span> {result.enableGraph ? "Enabled" : "Disabled"}
          </div>
        </div>
      );

    case "triggerOCR":
    case "runWorkflow":
      return (
        <div className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Status:</span> {result.status}
          </div>
          {result.workflowId && (
            <div>
              <span className="text-muted-foreground">Workflow ID:</span> {result.workflowId}
            </div>
          )}
          <div className="text-muted-foreground mt-2 text-xs">{result.message}</div>
        </div>
      );

    case "listVaultFiles":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold">{result.totalFiles}</span> files
            <span className="text-muted-foreground">•</span>
            <span className="font-bold">{result.searchableFiles}</span> searchable
          </div>
          {result.files && result.files.length > 0 && (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {result.files.map((file: any, i: number) => (
                <div key={i} className="flex items-center gap-2 rounded border p-2 text-xs">
                  {file.isSearchable ? (
                    <CheckCircle2 className="size-3 flex-shrink-0 text-green-500" />
                  ) : (
                    <Clock className="text-muted-foreground size-3 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{file.filename}</div>
                    <div className="text-muted-foreground">
                      {file.isSearchable ? `${file.chunkCount}c / ${file.vectorCount}v` : file.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "getVaultFileInfo":
      return (
        <div className="space-y-1 text-sm">
          <div className="font-medium">{result.filename}</div>
          <div>
            <span className="text-muted-foreground">Status:</span>{" "}
            <Badge variant={result.isSearchable ? "default" : "outline"} className="text-xs">
              {result.status}
            </Badge>
          </div>
          {result.isSearchable && (
            <>
              <div>
                <span className="text-muted-foreground">Chunks:</span> {result.indexingDetails.chunkCount}
              </div>
              <div>
                <span className="text-muted-foreground">Vectors:</span> {result.indexingDetails.vectorCount}
              </div>
              {result.indexingDetails.textLength && (
                <div>
                  <span className="text-muted-foreground">Text Length:</span>{" "}
                  {result.indexingDetails.textLength.toLocaleString()} chars
                </div>
              )}
            </>
          )}
        </div>
      );

    case "listVaults":
      return (
        <div className="space-y-2">
          <div className="text-sm">
            Found <span className="font-bold">{result.totalVaults}</span> vaults
          </div>
          {result.vaults && result.vaults.length > 0 && (
            <div className="space-y-1">
              {result.vaults.map((vault: any, i: number) => (
                <div key={i} className="rounded border p-2 text-xs">
                  <div className="font-medium">{vault.name}</div>
                  <div className="text-muted-foreground text-[10px]">ID: {vault.id}</div>
                  {vault.description && (
                    <div className="text-muted-foreground mt-1 text-[10px]">{vault.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "createVault":
      return (
        <div className="space-y-1 text-sm">
          <div className="font-medium">✓ Vault Created</div>
          <div>
            <span className="text-muted-foreground">Name:</span> {result.name}
          </div>
          <div>
            <span className="text-muted-foreground">ID:</span> {result.vaultId}
          </div>
          <div>
            <span className="text-muted-foreground">GraphRAG:</span> {result.enableGraph ? "Enabled" : "Disabled"}
          </div>
        </div>
      );

    case "listVaultObjects":
      return (
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-bold">{result.objects?.length || 0}</span> files in vault
          </div>
          {result.objects && result.objects.length > 0 && (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {result.objects.map((obj: any, i: number) => (
                <div key={i} className="flex items-center gap-2 rounded border p-2 text-xs">
                  {obj.chunkCount > 0 ? (
                    <CheckCircle2 className="size-3 text-green-500" />
                  ) : (
                    <Clock className="text-muted-foreground size-3" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{obj.filename}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {obj.chunkCount > 0 ? `${obj.chunkCount}c / ${obj.vectorCount}v` : obj.ingestionStatus}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "searchVault":
      return (
        <div className="space-y-2">
          <div className="text-sm">{result.response || `Found ${result.chunks?.length || 0} results`}</div>
          {result.chunks && result.chunks.length > 0 && (
            <div className="space-y-2">
              {result.chunks.map((chunk: any, i: number) => (
                <div key={i} className="bg-muted/30 rounded p-2 text-xs">
                  <div className="mb-1 font-medium">{chunk.filename}</div>
                  <div className="text-muted-foreground line-clamp-3">{chunk.text}</div>
                  <div className="text-muted-foreground mt-1 text-[10px]">
                    Score: {(chunk.score * 100).toFixed(0)}% • Chunk {chunk.chunkIndex}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "organizeVaultsByContent":
      return (
        <div className="space-y-2">
          <div className="text-sm">
            Analyzed <span className="font-bold">{result.totalFiles}</span> files across{" "}
            <span className="font-bold">{result.vaultsAnalyzed}</span> vaults
          </div>
          {result.categories && (
            <div className="space-y-2">
              {Object.entries(result.categories).map(
                ([category, files]: [string, any]) =>
                  files.length > 0 && (
                    <div key={category} className="rounded border p-2">
                      <div className="mb-1 text-xs font-medium">
                        {category} ({files.length})
                      </div>
                      <div className="space-y-0.5">
                        {files.slice(0, 3).map((file: string, i: number) => (
                          <div key={i} className="text-muted-foreground truncate text-[10px]">
                            • {file}
                          </div>
                        ))}
                        {files.length > 3 && (
                          <div className="text-muted-foreground text-[10px]">+{files.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  ),
              )}
            </div>
          )}
        </div>
      );

    case "searchWorkflows":
      return (
        <div className="space-y-2">
          <div className="text-sm">
            Found <span className="font-bold">{result.totalWorkflows}</span> workflow
            {result.totalWorkflows !== 1 ? "s" : ""}
            {result.query && result.query !== "all" && ` matching "${result.query}"`}
          </div>
          {result.workflows && result.workflows.length > 0 && (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {result.workflows.map((workflow: any, i: number) => (
                <div key={workflow.id || i} className="rounded border bg-muted/30 p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">#{i + 1}</span>
                        <span className="text-xs font-medium">{workflow.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {workflow.type}
                        </Badge>
                        {workflow.stage && (
                          <Badge variant="secondary" className="text-[10px]">
                            {workflow.stage}
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground mb-1 text-xs">{workflow.description}</div>
                      <div className="text-muted-foreground mb-1 text-[10px]">
                        <strong>ID:</strong> <code className="text-[9px]">{workflow.id}</code>
                      </div>
                      {workflow.parentCategory && (
                        <div className="text-muted-foreground mb-1 text-[10px]">
                          <strong>Category:</strong> {workflow.parentCategory}
                          {workflow.subCategory && ` / ${workflow.subCategory}`}
                        </div>
                      )}
                      {workflow.version && (
                        <div className="text-muted-foreground mb-1 text-[10px]">
                          <strong>Version:</strong> {workflow.version}
                        </div>
                      )}
                      {workflow.similarityScore !== undefined && (
                        <div className="text-muted-foreground text-[10px]">
                          <strong>Match:</strong> {(workflow.similarityScore * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "getWorkflow":
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium">{result.name}</div>
          <div className="text-muted-foreground text-xs">{result.description}</div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-muted-foreground">ID:</span> <code className="text-[10px]">{result.id}</code>
            </div>
            {result.parentCategory && (
              <div>
                <span className="text-muted-foreground">Category:</span> {result.parentCategory}
                {result.subCategory && ` / ${result.subCategory}`}
              </div>
            )}
            {result.type && (
              <div>
                <span className="text-muted-foreground">Type:</span> {result.type}
              </div>
            )}
            {result.stage && (
              <div>
                <span className="text-muted-foreground">Stage:</span>{" "}
                <Badge variant="outline" className="text-xs">
                  {result.stage}
                </Badge>
              </div>
            )}
            {result.version && (
              <div>
                <span className="text-muted-foreground">Version:</span> {result.version}
              </div>
            )}
            {result.demoVideoLink && (
              <div>
                <span className="text-muted-foreground">Demo:</span>{" "}
                <a href={result.demoVideoLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Watch Video
                </a>
              </div>
            )}
            {result.groundTruthExample && (
              <div>
                <span className="text-muted-foreground">Example:</span>{" "}
                <a href={result.groundTruthExample} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  View Example
                </a>
              </div>
            )}
          </div>
        </div>
      );

    case "executeWorkflow":
      return (
        <div className="space-y-2">
          <div className="font-medium text-sm">✓ Workflow Executed</div>
          <div className="space-y-1 text-xs">
            {result.workflowName && (
              <div>
                <span className="text-muted-foreground">Workflow:</span> {result.workflowName}
              </div>
            )}
            {result.executionId && (
              <div>
                <span className="text-muted-foreground">Execution ID:</span> <code className="text-[10px]">{result.executionId}</code>
              </div>
            )}
            {result.workflowId && (
              <div>
                <span className="text-muted-foreground">Workflow ID:</span> <code className="text-[10px]">{result.workflowId}</code>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              <Badge variant={result.status === "completed" ? "default" : "secondary"} className="text-xs">
                {result.status}
              </Badge>
            </div>
            {result.outputFormat && (
              <div>
                <span className="text-muted-foreground">Output Format:</span> {result.outputFormat}
              </div>
            )}
            {result.outputUrl && (
              <div>
                <span className="text-muted-foreground">Result:</span>{" "}
                <a href={result.outputUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {result.outputFormat === "pdf" ? "Download PDF" : "View Results"}
                </a>
                {result.outputExpiresAt && (
                  <span className="text-muted-foreground ml-1 text-[10px]">
                    (expires {new Date(result.outputExpiresAt).toLocaleDateString()})
                  </span>
                )}
              </div>
            )}
            {result.outputData && result.outputFormat === "json" && (
              <details className="mt-2">
                <summary className="text-muted-foreground cursor-pointer text-[10px] hover:text-foreground">
                  Show JSON Output
                </summary>
                <div className="bg-background/50 mt-2 max-h-48 overflow-y-auto rounded border p-2">
                  <pre className="whitespace-pre-wrap font-mono text-[9px]">{JSON.stringify(result.outputData, null, 2)}</pre>
                </div>
              </details>
            )}
            {result.usage && (
              <div className="mt-2 space-y-0.5 border-t pt-2 text-[10px]">
                <div>
                  <span className="text-muted-foreground">Tokens:</span> {result.usage.totalTokens?.toLocaleString()} (
                  {result.usage.promptTokens?.toLocaleString()} prompt + {result.usage.completionTokens?.toLocaleString()} completion)
                </div>
                {result.usage.cost && (
                  <div>
                    <span className="text-muted-foreground">Cost:</span> ${result.usage.cost.toFixed(6)}
                  </div>
                )}
              </div>
            )}
            {result.durationMs && (
              <div className="text-muted-foreground text-[10px]">
                Duration: {(result.durationMs / 1000).toFixed(2)}s
              </div>
            )}
            {result.createdAt && (
              <div className="text-muted-foreground text-[10px]">
                Created: {new Date(result.createdAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      );

    default:
      return <pre className="overflow-x-auto text-xs">{JSON.stringify(result, null, 2)}</pre>;
  }
}
