"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { FileJson, FileText, ExternalLink, AlertCircle, CheckCircle2, Clock, DollarSign, Maximize2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ViewResultDialog } from "./view-result-dialog";

interface WorkflowResult {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  output: {
    format: string;
    data?: any;
    url?: string;
  };
  usage?: {
    total_tokens: number;
    cost: number;
  };
  duration_ms?: number;
  created_at: string;
  document_name?: string;
}

interface WorkflowOutputProps {
  results: WorkflowResult[];
}

function FormattedData({ data }: { data: any }) {
  if (typeof data !== 'object' || data === null) {
    return <p className="text-sm whitespace-pre-wrap">{String(data)}</p>;
  }

  if (Array.isArray(data)) {
    return (
      <ul className="list-disc pl-4 space-y-1">
        {data.map((item, i) => (
          <li key={i}><FormattedData data={item} /></li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="grid grid-cols-[120px_1fr] gap-2 text-sm">
          <span className="font-medium text-muted-foreground capitalize shrink-0">
            {key.replace(/_/g, ' ')}:
          </span>
          <div className="min-w-0">
            <FormattedData data={value} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkflowOutput({ results }: WorkflowOutputProps) {
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleViewResult = (result: any) => {
    setSelectedResult(result);
    setDialogOpen(true);
  };

  if (results.length === 0) {
    return (
      <Card className="h-[300px] flex flex-col bg-muted/40 border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
          <div className="p-3 rounded-full bg-background border mb-3">
            <FileJson className="h-6 w-6 opacity-20" />
          </div>
          <p className="text-sm font-medium">No results yet</p>
          <p className="text-xs mt-1">Run a workflow to see outputs here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ViewResultDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        result={selectedResult}
      />
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {results.map((result) => (
        <Card key={result.id} className="flex flex-col h-[400px] overflow-hidden">
          <CardHeader className="pb-3 bg-muted/30 border-b shrink-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={result.status === "completed" ? "outline" : "destructive"}
                  className={cn("gap-1", result.status === "completed" ? "bg-green-500/10 text-green-700 border-green-200" : "")}
                >
                  {result.status === "completed" ? (
                    <><CheckCircle2 className="h-3 w-3" /> Completed</>
                  ) : (
                    <><AlertCircle className="h-3 w-3" /> Failed</>
                  )}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(result.created_at).toLocaleTimeString()}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleViewResult(result)}
                className="h-6 px-2 text-xs"
              >
                <Maximize2 className="h-3 w-3 mr-1" />
                View
              </Button>
            </div>
            <CardTitle className="text-sm font-medium truncate leading-tight" title={result.document_name}>
              {result.document_name || "Result"}
            </CardTitle>
            <p className="text-xs text-muted-foreground truncate">{result.workflow_name}</p>
          </CardHeader>
          
          <div className="flex items-center justify-between p-2 px-4 bg-background/50 border-b text-xs text-muted-foreground shrink-0">
            <span className="flex items-center gap-1">
              ⏱ {(result.duration_ms ? result.duration_ms / 1000 : 0).toFixed(2)}s
            </span>
            {result.usage && (
              <span className="flex items-center gap-1" title={`${result.usage.total_tokens} tokens`}>
                <DollarSign className="h-3 w-3" />
                {result.usage.cost.toFixed(5)}
              </span>
            )}
          </div>

          <CardContent className="flex-1 min-h-0 p-0 relative bg-card">
            <ScrollArea className="absolute inset-0">
              <div className="p-4">
                {result.status === "failed" ? (
                  <Alert variant="destructive" className="text-xs">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Execution Failed</AlertTitle>
                    <AlertDescription className="mt-1 break-words">
                      {typeof result.output.data === 'string' ? result.output.data : JSON.stringify(result.output)}
                    </AlertDescription>
                  </Alert>
                ) : result.output.format === "json" ? (
                   <div className="space-y-4">
                      <Tabs defaultValue="formatted" className="w-full">
                        <TabsList className="h-7 w-full justify-start rounded-none border-b bg-transparent p-0 mb-3">
                          <TabsTrigger value="formatted" className="relative h-7 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-2 pt-1 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none text-xs">
                            Formatted
                          </TabsTrigger>
                          <TabsTrigger value="raw" className="relative h-7 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-2 pt-1 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none text-xs">
                            Raw JSON
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="formatted" className="mt-0">
                          <FormattedData data={result.output.data} />
                        </TabsContent>
                        <TabsContent value="raw" className="mt-0">
                           <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-muted/50 p-2 rounded-md">
                            {JSON.stringify(result.output.data, null, 2)}
                          </pre>
                        </TabsContent>
                      </Tabs>
                   </div>
                ) : result.output.format === "pdf" && result.output.url ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                    <div className="p-4 bg-muted rounded-full">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">PDF Document Generated</p>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">Click to view or download</p>
                      <a 
                        href={result.output.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
                      >
                        Open PDF <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                   <div className="text-sm text-muted-foreground break-words">
                    <p className="font-medium mb-1 text-xs uppercase tracking-wide">Output:</p>
                    {typeof result.output.data === 'string' ? result.output.data : JSON.stringify(result.output)}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        ))}
      </div>
    </>
  );
}

