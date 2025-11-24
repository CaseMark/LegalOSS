"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/app/(main)/dashboard/_components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Code,
  LayoutList,
  Brain,
  ScanText,
  FolderLock,
  Mic,
  SquareFunction,
  MoveUp,
  MoveDown,
  Copy,
} from "lucide-react";
import { Action, ActionStep, ServiceType } from "../types";
import { toast } from "sonner";

// Mock Data (Duplicated from page.tsx for demo purposes - in real app this would be a store or API)
const MOCK_ACTIONS: Record<string, Action> = {
  act_dep_summary: {
    id: "act_dep_summary",
    name: "Deposition Summary Action",
    description: "Process deposition transcript end-to-end",
    definition: {
      steps: [
        {
          id: "summarize",
          service: "workflows",
          workflow_id: "deposition_summary_workflow",
          input: { text: "{{input.transcript}}" },
          options: { model: "anthropic/claude-sonnet-4.5", max_tokens: 3000 },
        },
        {
          id: "extract_timeline",
          service: "llm",
          input: {
            text: "From this summary, extract a timeline of events as JSON: {{steps.summarize.output.text}}",
          },
          options: { model: "anthropic/claude-sonnet-4.5", max_tokens: 1000 },
        },
        {
          id: "store_summary",
          service: "vault",
          action: "upload",
          vault_id: "case_vault_123",
          input: {
            filename: "deposition_summary.json",
            content: "{{steps.summarize.output}}",
            metadata: {
              case_id: "{{input.case_id}}",
              document_type: "deposition_summary",
              processed_at: "{{timestamp}}",
            },
          },
        },
      ],
    },
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2025-01-15T10:00:00Z",
  },
  act_contract_analysis: {
    id: "act_contract_analysis",
    name: "Contract Analysis",
    description: "OCR contract, analyze clauses, identify risks",
    definition: {
      steps: [
        {
          id: "ocr",
          service: "ocr",
          input: { document_url: "{{input.contract_url}}" },
        },
        {
          id: "extract_clauses",
          service: "llm",
          input: {
            text: "Extract all indemnification clauses from this contract as JSON: {{steps.ocr.output.text}}",
          },
          options: {
            model: "openai/gpt-5",
            max_tokens: 2000,
            temperature: 0,
          },
        },
        {
          id: "risk_analysis",
          service: "llm",
          input: {
            text: "Analyze these clauses for risks: {{steps.extract_clauses.output.content}}",
          },
          options: {
            model: "anthropic/claude-opus-4.1",
            max_tokens: 1500,
          },
        },
      ],
    },
    created_at: "2025-01-14T15:30:00Z",
    updated_at: "2025-01-14T15:30:00Z",
  },
  act_meeting_transcribe: {
    id: "act_meeting_transcribe",
    name: "Audio Transcription Pipeline",
    description: "Transcribe audio, summarize, extract action items",
    webhook_id: "webhook_notifications",
    definition: {
      steps: [
        {
          id: "transcribe",
          service: "voice",
          input: { audio_url: "{{input.audio_url}}" },
        },
        {
          id: "summarize",
          service: "llm",
          input: {
            text: "Summarize this meeting transcript: {{steps.transcribe.output.text}}",
          },
          options: { max_tokens: 1000 },
        },
        {
          id: "action_items",
          service: "llm",
          input: {
            text: "Extract action items as JSON from: {{steps.transcribe.output.text}}",
          },
          options: { max_tokens: 500 },
        },
      ],
    },
    created_at: "2025-01-12T09:15:00Z",
    updated_at: "2025-01-12T09:15:00Z",
  },
};

const SERVICE_CONFIG = {
  llm: { label: "LLM", icon: Brain, color: "bg-purple-100 text-purple-800" },
  ocr: { label: "OCR", icon: ScanText, color: "bg-blue-100 text-blue-800" },
  vault: {
    label: "Vault",
    icon: FolderLock,
    color: "bg-orange-100 text-orange-800",
  },
  voice: { label: "Voice", icon: Mic, color: "bg-green-100 text-green-800" },
  workflows: {
    label: "Workflow",
    icon: SquareFunction,
    color: "bg-slate-100 text-slate-800",
  },
};

interface ActionsBuilderProps {
  actionId?: string;
}

export function ActionsBuilder({ actionId }: ActionsBuilderProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"visual" | "code">("visual");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<ActionStep[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Load initial data if editing
  useEffect(() => {
    if (actionId && MOCK_ACTIONS[actionId]) {
      const action = MOCK_ACTIONS[actionId];
      setName(action.name);
      setDescription(action.description);
      setSteps(action.definition.steps);
    }
  }, [actionId]);

  const handleStepChange = (index: number, field: keyof ActionStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
    setIsDirty(true);
  };

  const handleNestedChange = (
    index: number,
    parent: "input" | "options",
    key: string,
    value: any
  ) => {
    const newSteps = [...steps];
    newSteps[index] = {
      ...newSteps[index],
      [parent]: { ...newSteps[index][parent], [key]: value },
    };
    setSteps(newSteps);
    setIsDirty(true);
  };

  const addStep = (service: ServiceType) => {
    const newStep: ActionStep = {
      id: `step_${steps.length + 1}`,
      service,
      input: {},
      options: {},
    };
    setSteps([...steps, newStep]);
    setIsDirty(true);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
    setIsDirty(true);
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    )
      return;

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [
      newSteps[targetIndex],
      newSteps[index],
    ];
    setSteps(newSteps);
    setIsDirty(true);
  };

  const handleSave = () => {
    // In a real app, this would make an API call
    toast.success("Action saved successfully");
    setIsDirty(false);
    router.push("/dashboard/actions");
  };

  // Generate JSON for Code view
  const getJson = () => {
    return JSON.stringify(
      {
        name,
        description,
        definition: { steps },
      },
      null,
      2
    );
  };

  // Parse JSON from Code view
  const handleCodeChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (parsed.name) setName(parsed.name);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.definition?.steps) setSteps(parsed.definition.steps);
      setCodeError(null);
      setIsDirty(true);
    } catch (e) {
      setCodeError((e as Error).message);
    }
  };

  return (
    <>
      <AppHeader
        title={actionId ? "Edit Action" : "Create Action"}
        description={actionId ? `Editing ${name}` : "Build a new automation flow"}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isDirty && !actionId}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </AppHeader>

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0 h-[calc(100vh-200px)]">
        <div className="flex gap-4 items-start">
          <div className="flex-1 space-y-2">
            <Label>Action Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIsDirty(true);
              }}
              placeholder="e.g., Deposition Summary"
            />
          </div>
          <div className="flex-[2] space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsDirty(true);
              }}
              placeholder="What does this action do?"
            />
          </div>
        </div>

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "visual" | "code")}
          className="flex-1 flex flex-col"
        >
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="visual">
                <LayoutList className="mr-2 h-4 w-4" />
                Visual Builder
              </TabsTrigger>
              <TabsTrigger value="code">
                <Code className="mr-2 h-4 w-4" />
                Code View
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="visual" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="flex flex-col gap-4 pb-20">
                {steps.map((step, index) => {
                  const ServiceIcon = SERVICE_CONFIG[step.service].icon;
                  return (
                    <div key={index} className="relative group">
                      {/* Connector Line */}
                      {index > 0 && (
                        <div className="absolute -top-4 left-8 w-0.5 h-4 bg-border" />
                      )}

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-md ${
                                SERVICE_CONFIG[step.service].color
                              }`}
                            >
                              <ServiceIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-base font-medium">
                                {step.id}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {SERVICE_CONFIG[step.service].label} Service
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveStep(index, "up")}
                              disabled={index === 0}
                            >
                              <MoveUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveStep(index, "down")}
                              disabled={index === steps.length - 1}
                            >
                              <MoveDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeStep(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs">Step ID</Label>
                              <Input
                                value={step.id}
                                onChange={(e) =>
                                  handleStepChange(index, "id", e.target.value)
                                }
                                className="font-mono text-sm"
                              />
                            </div>
                            {/* Service Specific Fields */}
                            {step.service === "llm" && (
                              <div className="space-y-2">
                                <Label className="text-xs">Model</Label>
                                <Select
                                  value={step.options?.model || "openai/gpt-4"}
                                  onValueChange={(v) =>
                                    handleNestedChange(index, "options", "model", v)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="openai/gpt-4">
                                      GPT-4
                                    </SelectItem>
                                    <SelectItem value="anthropic/claude-3-opus">
                                      Claude 3 Opus
                                    </SelectItem>
                                    <SelectItem value="anthropic/claude-3-sonnet">
                                      Claude 3.5 Sonnet
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {/* Dynamic Inputs based on Service */}
                          {step.service === "llm" && (
                            <div className="space-y-2">
                              <Label className="text-xs">Prompt Template</Label>
                              <Textarea
                                value={step.input.text || ""}
                                onChange={(e) =>
                                  handleNestedChange(
                                    index,
                                    "input",
                                    "text",
                                    e.target.value
                                  )
                                }
                                className="font-mono text-sm min-h-[100px]"
                                placeholder="Summarize this text: {{input.text}}"
                              />
                              <p className="text-[10px] text-muted-foreground">
                                Use {"{{variable}}"} to reference outputs from
                                previous steps.
                              </p>
                            </div>
                          )}

                          {step.service === "ocr" && (
                            <div className="space-y-2">
                              <Label className="text-xs">Document URL</Label>
                              <Input
                                value={step.input.document_url || ""}
                                onChange={(e) =>
                                  handleNestedChange(
                                    index,
                                    "input",
                                    "document_url",
                                    e.target.value
                                  )
                                }
                                placeholder="{{input.url}}"
                                className="font-mono text-sm"
                              />
                            </div>
                          )}
                          
                          {step.service === "voice" && (
                            <div className="space-y-2">
                              <Label className="text-xs">Audio URL</Label>
                              <Input
                                value={step.input.audio_url || ""}
                                onChange={(e) =>
                                  handleNestedChange(
                                    index,
                                    "input",
                                    "audio_url",
                                    e.target.value
                                  )
                                }
                                placeholder="{{input.audio_url}}"
                                className="font-mono text-sm"
                              />
                            </div>
                          )}

                          {step.service === "vault" && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs">Action</Label>
                                <Select
                                  value={step.action || "upload"}
                                  onValueChange={(v) =>
                                    handleStepChange(index, "action", v)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="upload">Upload File</SelectItem>
                                    <SelectItem value="search">Search</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Vault ID</Label>
                                <Input
                                  value={step.vault_id || ""}
                                  onChange={(e) =>
                                    handleStepChange(index, "vault_id", e.target.value)
                                  }
                                  placeholder="vault_123"
                                  className="font-mono text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}

                <div className="flex items-center justify-center gap-2 py-4 border-2 border-dashed rounded-lg">
                  <span className="text-sm text-muted-foreground">Add Step:</span>
                  <div className="flex gap-2">
                    {(Object.keys(SERVICE_CONFIG) as ServiceType[]).map((type) => {
                      const Icon = SERVICE_CONFIG[type].icon;
                      return (
                        <Button
                          key={type}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => addStep(type)}
                        >
                          <Icon className="h-3 w-3" />
                          {SERVICE_CONFIG[type].label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="code" className="flex-1 h-full">
            <div className="relative h-full">
              <Textarea
                value={getJson()}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="font-mono text-sm h-full resize-none p-4"
              />
              {codeError && (
                <div className="absolute bottom-4 left-4 right-4 bg-destructive/10 text-destructive text-sm p-2 rounded border border-destructive/20">
                  JSON Error: {codeError}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}



