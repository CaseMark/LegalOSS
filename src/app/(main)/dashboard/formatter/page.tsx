"use client";

import { useMemo, useState, useEffect } from "react";

import {
  Plus,
  Notebook,
  FileText,
  ExternalLink,
  Download,
  Wand2,
  ListChecks,
  PencilRuler,
  HardDrive,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { AppHeader } from "@/app/(main)/dashboard/_components/header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useVaults, useVaultObjects } from "@/lib/hooks/use-vaults";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TEMPLATE_TYPES = [
  { value: "caption", label: "Caption" },
  { value: "signature", label: "Signature" },
  { value: "letterhead", label: "Letterhead" },
  { value: "certificate", label: "Certificate" },
  { value: "footer", label: "Footer" },
  { value: "custom", label: "Custom" },
] as const;

const INPUT_FORMATS = [
  { value: "md", label: "Markdown" },
  { value: "json", label: "JSON" },
  { value: "text", label: "Plain Text" },
];

const OUTPUT_FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
];

type FormatterTemplate = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  variables?: string[];
  tags?: string[];
  usageCount?: number;
  createdAt?: string;
};

type TemplateDetail = FormatterTemplate & {
  content: string;
  styles?: Record<string, unknown> | null;
};

type ComponentConfig = {
  id: string;
  templateId?: string;
  label: string;
  variables: Record<string, string>;
  content?: string;
};

type FormatResult = {
  url: string;
  contentType: string;
  fileName: string;
  size: number;
};

export default function FormatterPage() {
  const { data, isLoading, mutate } = useSWR<{ templates: FormatterTemplate[] }>("/api/formatter/templates", fetcher);
  const templates = data?.templates ?? [];

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { data: templateDetailData, isLoading: isDetailLoading } = useSWR<TemplateDetail>(
    selectedTemplateId ? `/api/formatter/templates/${selectedTemplateId}` : null,
    fetcher,
  );

  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [templateSearch, setTemplateSearch] = useState("");
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesType = templateFilter === "all" || template.type === templateFilter;
      const matchesSearch =
        !templateSearch ||
        template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        template.description?.toLowerCase().includes(templateSearch.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [templates, templateFilter, templateSearch]);

  const [isTemplateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    type: "caption",
    tags: "",
    content: "",
    styles: "",
  });
  const [isCreatingTemplate, setCreatingTemplate] = useState(false);

  const [inputFormat, setInputFormat] = useState("md");
  const [outputFormat, setOutputFormat] = useState("pdf");
  const [documentContent, setDocumentContent] = useState(`# Legal Brief Template

## Background
- Parties: {{plaintiff}} v. {{defendant}}
- Court: {{court}}
- Docket: {{docket}}

## Summary
{{summary}}

## Relief Requested
{{relief}}
`);
  const [components, setComponents] = useState<ComponentConfig[]>([]);
  const [isFormatting, setFormatting] = useState(false);
  const [formatResult, setFormatResult] = useState<FormatResult | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const { vaults } = useVaults();
  const [vaultSourceId, setVaultSourceId] = useState<string | null>(null);
  const { objects: vaultSourceObjects = [] } = useVaultObjects(vaultSourceId);
  const [vaultObjectId, setVaultObjectId] = useState<string | null>(null);
  const [isLoadingVaultContent, setIsLoadingVaultContent] = useState(false);
  const [loadedObjectLabel, setLoadedObjectLabel] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (formatResult?.url) {
        URL.revokeObjectURL(formatResult.url);
      }
    };
  }, [formatResult]);

  const selectedTemplate = templateDetailData;
  const selectedVaultName = useMemo(
    () => vaults.find((vault: any) => vault.id === vaultSourceId)?.name || "",
    [vaults, vaultSourceId],
  );

  const detectedVariables = useMemo(() => {
    const matches = documentContent.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((match) => match.replace(/[{}]/g, ""))));
  }, [documentContent]);

  const formatterPayload = useMemo(() => {
    const payload: any = {
      content: documentContent,
      input_format: inputFormat,
      output_format: outputFormat,
    };

    if (components.length) {
      payload.options = {
        components: components.map(({ templateId, label, content, variables }) => ({
          templateId: templateId || undefined,
          label,
          content: templateId ? undefined : content,
          variables,
        })),
      };
    }

    return payload;
  }, [documentContent, inputFormat, outputFormat, components]);

  useEffect(() => {
    if (vaults.length && !vaultSourceId) {
      setVaultSourceId(vaults[0]?.id || null);
    }
  }, [vaults, vaultSourceId]);

  useEffect(() => {
    if (!vaultSourceObjects.length) {
      setVaultObjectId(null);
      return;
    }
    if (!vaultObjectId || !vaultSourceObjects.some((object: any) => object.id === vaultObjectId)) {
      setVaultObjectId(vaultSourceObjects[0]?.id || null);
    }
  }, [vaultSourceObjects, vaultObjectId]);

  const loadDocumentFromVault = async () => {
    if (!vaultSourceId || !vaultObjectId) {
      toast.error("Select a vault and object to load");
      return;
    }
    try {
      setIsLoadingVaultContent(true);
      let textPayload: string | null = null;
      let derivedFormat: "md" | "json" | "text" = "text";

      const textResponse = await fetch(`/api/vaults/${vaultSourceId}/objects/${vaultObjectId}/text`);
      if (textResponse.ok) {
        const data = await textResponse.json();
        if (typeof data?.text === "string") {
          textPayload = data.text;
        }
      }

      if (!textPayload) {
        const downloadResponse = await fetch(`/api/vaults/${vaultSourceId}/objects/${vaultObjectId}/download`);
        if (!downloadResponse.ok) {
          const error = await downloadResponse.json().catch(() => ({ error: "Unable to download object" }));
          throw new Error(error.error || "Unable to download object");
        }
        const contentType = downloadResponse.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const json = await downloadResponse.json();
          textPayload = JSON.stringify(json, null, 2);
          derivedFormat = "json";
        } else if (contentType.startsWith("text/") || contentType.includes("markdown")) {
          textPayload = await downloadResponse.text();
          derivedFormat = contentType.includes("markdown") ? "md" : "text";
        } else {
          throw new Error("Selected object is binary and cannot be loaded as text");
        }
      }

      const selectedObject = vaultSourceObjects.find((object: any) => object.id === vaultObjectId);
      if (selectedObject?.filename) {
        const lower = selectedObject.filename.toLowerCase();
        if (lower.endsWith(".json")) {
          derivedFormat = "json";
        } else if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
          derivedFormat = "md";
        } else if (lower.endsWith(".txt")) {
          derivedFormat = "text";
        }
      }

      if (!textPayload) {
        throw new Error("No text available for this object");
      }

      setInputFormat(derivedFormat);
      setDocumentContent(textPayload);
      setLoadedObjectLabel(
        `${selectedObject?.filename || "Object"}${selectedVaultName ? ` · ${selectedVaultName}` : ""}`,
      );
      toast.success("Loaded content from vault");
    } catch (error: any) {
      toast.error(error.message || "Failed to load document from vault");
    } finally {
      setIsLoadingVaultContent(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      setCreatingTemplate(true);
      const tags = newTemplate.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      let stylesJson: any | undefined;
      if (newTemplate.styles) {
        try {
          stylesJson = JSON.parse(newTemplate.styles);
        } catch {
          throw new Error("Styles must be valid JSON");
        }
      }

      const response = await fetch("/api/formatter/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplate.name,
          description: newTemplate.description || undefined,
          type: newTemplate.type,
          content: newTemplate.content,
          styles: stylesJson,
          tags,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to create template" }));
        throw new Error(error.error || "Failed to create template");
      }

      toast.success("Template created");
      setTemplateDialogOpen(false);
      setNewTemplate({
        name: "",
        description: "",
        type: "caption",
        tags: "",
        content: "",
        styles: "",
      });
      mutate();
    } catch (error: any) {
      toast.error(error.message || "Failed to create template");
    } finally {
      setCreatingTemplate(false);
    }
  };

  const addComponent = () => {
    setComponents((prev) => [
      ...prev,
      {
        id: `component-${Date.now()}`,
        label: `Component ${prev.length + 1}`,
        variables: {},
      },
    ]);
  };

  const updateComponent = (id: string, updates: Partial<ComponentConfig>) => {
    setComponents((prev) =>
      prev.map((component) => {
        if (component.id !== id) return component;
        return { ...component, ...updates };
      }),
    );
  };

  const removeComponent = (id: string) => {
    setComponents((prev) => prev.filter((component) => component.id !== id));
  };

  const handleFormat = async () => {
    try {
      setFormatting(true);
      setFormatError(null);

      const response = await fetch("/api/formatter/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formatterPayload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to format document" }));
        throw new Error(error.error || "Failed to format document");
      }

      const blob = await response.blob();
      const contentType = response.headers.get("Content-Type") || "application/octet-stream";
      const disposition = response.headers.get("Content-Disposition") || "";
      const fileNameMatch = disposition.match(/filename="(.+?)"/i);
      const fileName = fileNameMatch?.[1] || `formatted.${outputFormat}`;
      const url = URL.createObjectURL(blob);

      if (formatResult?.url) {
        URL.revokeObjectURL(formatResult.url);
      }

      setFormatResult({
        url,
        contentType,
        fileName,
        size: blob.size,
      });

      toast.success("Document formatted");
    } catch (error: any) {
      setFormatError(error.message || "Formatting failed");
      toast.error(error.message || "Failed to format document");
    } finally {
      setFormatting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Formatter"
        description="Generate court-ready PDFs and DOCX files, assemble legal components, and manage reusable templates."
      >
        <Button variant="outline" asChild>
          <a href="https://docs.case.dev/services/convert" target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 size-4" />
            Formatter Docs
          </a>
        </Button>
      </AppHeader>

      <div className="flex flex-1 flex-col gap-4 px-6 pb-6">
        <Tabs defaultValue="playground" className="flex h-full flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="playground">Format Playground</TabsTrigger>
            <TabsTrigger value="templates">Template Library</TabsTrigger>
          </TabsList>

          <TabsContent value="playground" className="mt-4 flex flex-1 gap-4">
            <div className="flex w-1/2 flex-col gap-4">
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Notebook className="size-4" />
                    Document Source
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Provide Markdown, JSON, or rich text with template variables.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-foreground font-medium">Load from Vault</p>
                        <p className="text-muted-foreground text-sm">
                          Use processed text or JSON stored in your vaults.
                        </p>
                      </div>
                      {loadedObjectLabel && <Badge variant="secondary">{loadedObjectLabel}</Badge>}
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Vault</Label>
                        <Select value={vaultSourceId ?? ""} onValueChange={setVaultSourceId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vault" />
                          </SelectTrigger>
                          <SelectContent>
                            {vaults.map((vault: any) => (
                              <SelectItem key={vault.id} value={vault.id}>
                                {vault.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Object</Label>
                        <Select
                          value={vaultObjectId ?? ""}
                          onValueChange={setVaultObjectId}
                          disabled={!vaultSourceObjects.length}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select object" />
                          </SelectTrigger>
                          <SelectContent>
                            {vaultSourceObjects.map((object: any) => (
                              <SelectItem key={object.id} value={object.id}>
                                {object.filename}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={loadDocumentFromVault}
                      disabled={isLoadingVaultContent || !vaultSourceId || !vaultObjectId}
                    >
                      {isLoadingVaultContent ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Loading
                        </>
                      ) : (
                        <>
                          <HardDrive className="mr-2 size-4" />
                          Load Content
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Input Format</Label>
                      <Select value={inputFormat} onValueChange={setInputFormat}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select input format" />
                        </SelectTrigger>
                        <SelectContent>
                          {INPUT_FORMATS.map((format) => (
                            <SelectItem key={format.value} value={format.value}>
                              {format.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Output Format</Label>
                      <Select value={outputFormat} onValueChange={setOutputFormat}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select output format" />
                        </SelectTrigger>
                        <SelectContent>
                          {OUTPUT_FORMATS.map((format) => (
                            <SelectItem key={format.value} value={format.value}>
                              {format.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={documentContent}
                      onChange={(event) => setDocumentContent(event.target.value)}
                      className="min-h-[280px] font-mono text-sm"
                    />
                    {detectedVariables.length > 0 && (
                      <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                        <span>Detected variables:</span>
                        {detectedVariables.map((variable) => (
                          <Badge key={variable} variant="outline">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <ListChecks className="size-4" />
                      Components
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Stitch caption blocks, letterhead, footers, and signatures into the final document.
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={addComponent}>
                    <Plus className="mr-2 size-4" />
                    Add
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {components.length === 0 ? (
                    <div className="text-muted-foreground text-sm">No components attached</div>
                  ) : (
                    <div className="space-y-4">
                      {components.map((component) => {
                        const template = component.templateId
                          ? templates.find((item) => item.id === component.templateId)
                          : null;

                        return (
                          <div key={component.id} className="rounded-lg border p-4">
                            <div className="mb-4 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <PencilRuler className="text-muted-foreground size-4" />
                                <Input
                                  value={component.label}
                                  onChange={(event) => updateComponent(component.id, { label: event.target.value })}
                                />
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeComponent(component.id)}>
                                Remove
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <Label>Template</Label>
                              <Select
                                value={component.templateId || "custom"}
                                onValueChange={(value) => {
                                  if (value === "custom") {
                                    updateComponent(component.id, { templateId: undefined, content: "" });
                                    return;
                                  }
                                  const selected = templates.find((item) => item.id === value);
                                  const variables: Record<string, string> = {};
                                  selected?.variables?.forEach((variable) => {
                                    variables[variable] = component.variables[variable] || "";
                                  });
                                  updateComponent(component.id, {
                                    templateId: value,
                                    variables,
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select template" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="custom">Custom Component</SelectItem>
                                  {templates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {component.templateId ? (
                              <div className="mt-4 space-y-2">
                                <Label>Variables</Label>
                                {template?.variables?.length ? (
                                  <div className="grid gap-2 md:grid-cols-2">
                                    {template.variables.map((variable) => (
                                      <div key={variable} className="space-y-1">
                                        <Label className="text-muted-foreground text-xs">{variable}</Label>
                                        <Input
                                          value={component.variables[variable] || ""}
                                          placeholder={`Value for ${variable}`}
                                          onChange={(event) =>
                                            updateComponent(component.id, {
                                              variables: {
                                                ...component.variables,
                                                [variable]: event.target.value,
                                              },
                                            })
                                          }
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground text-sm">Template has no variables</p>
                                )}
                              </div>
                            ) : (
                              <div className="mt-4 space-y-2">
                                <Label>Custom Content</Label>
                                <Textarea
                                  value={component.content}
                                  placeholder="Provide inline Markdown or text"
                                  className="min-h-[120px] font-mono text-sm"
                                  onChange={(event) => updateComponent(component.id, { content: event.target.value })}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
                <Separator />
                <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-muted-foreground text-sm">
                    Attach caption blocks, letterhead, or inline snippets to compose filings.
                  </div>
                  <Button onClick={handleFormat} disabled={isFormatting}>
                    <FileText className="mr-2 size-4" />
                    {isFormatting ? "Formatting..." : "Generate Output"}
                  </Button>
                </CardContent>
                {formatError && (
                  <CardContent>
                    <div className="text-destructive text-sm">{formatError}</div>
                  </CardContent>
                )}
              </Card>
            </div>

            <div className="flex w-1/2 flex-col gap-4">
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <FileText className="size-4" />
                    Formatter Output
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Preview PDFs inline or download generated DOCX files.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex h-full flex-col gap-4">
                  {!formatResult ? (
                    <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center text-sm">
                      Run the formatter to preview output
                    </div>
                  ) : (
                    <>
                      {formatResult.contentType.includes("pdf") ? (
                        <iframe src={formatResult.url} className="h-[480px] w-full rounded border" />
                      ) : (
                        <div className="text-muted-foreground bg-muted/30 flex flex-1 flex-col items-center justify-center rounded border border-dashed text-sm">
                          DOCX preview not supported. Download the file to review.
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="secondary">{formatResult.contentType}</Badge>
                        <span className="text-muted-foreground">
                          {(formatResult.size / 1024).toFixed(1)} KB • {formatResult.fileName}
                        </span>
                        <Button variant="outline" size="sm" asChild>
                          <a href={formatResult.url} download={formatResult.fileName}>
                            <Download className="mr-2 size-4" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground text-base">Request Payload</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Sent to <code>/format/v1/document</code> via the local proxy.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="bg-muted/30 h-60 rounded border p-4 font-mono text-xs">
                    <pre>{JSON.stringify(formatterPayload, null, 2)}</pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-4 flex flex-1 gap-4">
            <div className="flex w-1/2 flex-col gap-4">
              <Card>
                <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-foreground">Template Library</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Manage reusable caption blocks and styles.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={templateFilter} onValueChange={setTemplateFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Filter type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {TEMPLATE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(event) => setTemplateSearch(event.target.value)}
                      className="w-48"
                    />
                    <Dialog open={isTemplateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 size-4" />
                          New Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Create Template</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4">
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Name</Label>
                              <Input
                                value={newTemplate.name}
                                onChange={(event) => setNewTemplate((prev) => ({ ...prev, name: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Type</Label>
                              <Select
                                value={newTemplate.type}
                                onValueChange={(value) => setNewTemplate((prev) => ({ ...prev, type: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TEMPLATE_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                              value={newTemplate.description}
                              onChange={(event) =>
                                setNewTemplate((prev) => ({ ...prev, description: event.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tags (comma separated)</Label>
                            <Input
                              value={newTemplate.tags}
                              onChange={(event) => setNewTemplate((prev) => ({ ...prev, tags: event.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Content</Label>
                            <Textarea
                              value={newTemplate.content}
                              onChange={(event) => setNewTemplate((prev) => ({ ...prev, content: event.target.value }))}
                              className="min-h-[180px] font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Styles (JSON)</Label>
                            <Textarea
                              value={newTemplate.styles}
                              onChange={(event) => setNewTemplate((prev) => ({ ...prev, styles: event.target.value }))}
                              className="font-mono text-sm"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateTemplate} disabled={isCreatingTemplate}>
                            {isCreatingTemplate ? "Creating..." : "Create Template"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-muted-foreground py-12 text-center text-sm">Loading templates...</div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="text-muted-foreground py-12 text-center text-sm">No templates found</div>
                  ) : (
                    <ScrollArea className="max-h-[540px] pr-4">
                      <div className="grid gap-4">
                        {filteredTemplates.map((template) => (
                          <button
                            key={template.id}
                            className={`hover:border-primary rounded-lg border p-4 text-left transition ${
                              selectedTemplateId === template.id ? "border-primary bg-primary/5" : "border-border"
                            }`}
                            onClick={() => setSelectedTemplateId(template.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-foreground font-medium">{template.name}</p>
                                <p className="text-muted-foreground text-sm">{template.description}</p>
                              </div>
                              <Badge variant="outline">{template.type}</Badge>
                            </div>
                            <div className="text-muted-foreground mt-2 flex flex-wrap gap-2 text-xs">
                              {template.variables?.map((variable) => (
                                <Badge key={variable} variant="secondary">
                                  {variable}
                                </Badge>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex w-1/2 flex-col gap-4">
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="text-foreground">Template Preview</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    GET <code>/format/v1/templates/{selectedTemplateId || ":id"}</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedTemplateId === null ? (
                    <div className="text-muted-foreground py-24 text-center text-sm">
                      Select a template to preview details
                    </div>
                  ) : isDetailLoading ? (
                    <div className="text-muted-foreground py-24 text-center text-sm">Loading template...</div>
                  ) : !selectedTemplate ? (
                    <div className="text-destructive py-24 text-center text-sm">Failed to load template</div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline">{selectedTemplate.type}</Badge>
                        {selectedTemplate.tags?.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                        <span className="text-muted-foreground">
                          Usage: {selectedTemplate.usageCount ?? 0} • Updated{" "}
                          {selectedTemplate.createdAt
                            ? new Date(selectedTemplate.createdAt).toLocaleDateString()
                            : "unknown"}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-muted-foreground">Content</p>
                        <ScrollArea className="bg-muted/30 h-64 rounded border p-4 font-mono text-xs">
                          <pre>{selectedTemplate.content}</pre>
                        </ScrollArea>
                      </div>
                      {selectedTemplate.styles && (
                        <div className="space-y-2 text-sm">
                          <p className="text-muted-foreground">Styles</p>
                          <ScrollArea className="bg-muted/30 h-40 rounded border p-4 font-mono text-xs">
                            <pre>{JSON.stringify(selectedTemplate.styles, null, 2)}</pre>
                          </ScrollArea>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (!selectedTemplateId) return;
                                  setComponents((prev) => [
                                    ...prev,
                                    {
                                      id: `component-${Date.now()}`,
                                      templateId: selectedTemplateId,
                                      label: selectedTemplate.name,
                                      variables: (selectedTemplate.variables || []).reduce(
                                        (acc, variable) => ({ ...acc, [variable]: "" }),
                                        {},
                                      ),
                                    },
                                  ]);
                                  toast.success("Template added to components");
                                }}
                              >
                                Use in Playground
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add this template to the current formatter request</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!selectedTemplate) return;
                            navigator.clipboard.writeText(selectedTemplate.content);
                            toast.success("Template content copied");
                          }}
                        >
                          Copy Content
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground text-base">REST Endpoints</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    All UI actions map to Case.dev Formatter endpoints.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-col gap-1 rounded border p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">GET</Badge>
                      <code>/format/v1/templates</code>
                    </div>
                    <p className="text-muted-foreground">
                      Lists templates scoped to your organization. Filter by type for quick discovery.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 rounded border p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge>
                      <code>/format/v1/templates</code>
                    </div>
                    <p className="text-muted-foreground">
                      Creates reusable caption blocks, signatures, and other components with optional styles.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 rounded border p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">GET</Badge>
                      <code>/format/v1/templates/:id</code>
                    </div>
                    <p className="text-muted-foreground">
                      Returns the full template body, styles, tags, and usage counts for assembly.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 rounded border p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge>
                      <code>/format/v1/document</code>
                    </div>
                    <p className="text-muted-foreground">
                      Formats Markdown or JSON into polished PDFs and DOCX outputs with component interpolation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
