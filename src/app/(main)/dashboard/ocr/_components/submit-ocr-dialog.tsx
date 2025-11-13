"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z
  .object({
    mode: z.enum(["url", "vault"]),
    documentUrl: z.string().optional(),
    filename: z.string().optional(),
    vaultId: z.string().optional(),
    objectId: z.string().optional(),
    engine: z.enum(["doctr", "tesseract", "paddle"]).default("doctr"),
    enableEmbed: z.boolean().default(true),
    enableTables: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.mode === "url") {
        return !!data.documentUrl && data.documentUrl.startsWith("http");
      }
      if (data.mode === "vault") {
        return !!data.vaultId && !!data.objectId;
      }
      return false;
    },
    {
      message: "Please provide all required fields for the selected mode",
      path: ["mode"],
    },
  );

interface SubmitOCRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SubmitOCRDialog({ open, onOpenChange, onSuccess }: SubmitOCRDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: "url",
      documentUrl: "",
      filename: "",
      vaultId: "",
      objectId: "",
      engine: "doctr",
      enableEmbed: true,
      enableTables: false,
    },
  });

  const mode = form.watch("mode");
  const vaultId = form.watch("vaultId");

  // Load vaults for dropdown
  const { data: vaultsData } = useSWR("/api/vaults", fetcher);
  const vaults = vaultsData?.vaults || [];

  // Load objects when vault is selected
  const { data: objectsData } = useSWR(vaultId ? `/api/vaults/${vaultId}/objects` : null, fetcher);
  const objects = objectsData?.objects || [];

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    console.log("OCR form submitted with data:", data);
    setIsLoading(true);

    try {
      const features: any = {};
      if (data.enableEmbed) features.embed = {};
      if (data.enableTables) features.tables = { format: "csv" };

      const payload =
        data.mode === "url"
          ? {
              documentUrl: data.documentUrl,
              filename: data.filename || "document.pdf",
              engine: data.engine,
              features,
            }
          : {
              vaultId: data.vaultId,
              objectId: data.objectId,
              engine: data.engine,
              features,
            };

      console.log("Sending OCR payload:", payload);

      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("OCR API response:", result);

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit OCR job");
      }

      toast.success("OCR job submitted", {
        description: `Processing document (Job ID: ${result.id})`,
        duration: 5000,
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("OCR submission error:", error);
      toast.error("Failed to submit OCR job", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Process Document with OCR</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Extract text from scanned documents, PDFs, or images using AI-powered OCR
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              console.log("Form submit event fired");
              console.log("Form values:", form.getValues());
              console.log("Form errors:", form.formState.errors);
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            {/* Mode Selection */}
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Document Source</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="url" id="url" />
                        <Label htmlFor="url" className="text-foreground cursor-pointer font-normal">
                          Direct URL
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="vault" id="vault" />
                        <Label htmlFor="vault" className="text-foreground cursor-pointer font-normal">
                          From Vault
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* URL Mode */}
            {mode === "url" && (
              <>
                <FormField
                  control={form.control}
                  name="documentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Document URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/document.pdf" {...field} className="text-foreground" />
                      </FormControl>
                      <FormDescription className="text-muted-foreground">
                        Publicly accessible URL to your document
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="filename"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Filename (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="document.pdf" {...field} className="text-foreground" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Vault Mode */}
            {mode === "vault" && (
              <>
                <FormField
                  control={form.control}
                  name="vaultId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Select Vault</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-foreground">
                            <SelectValue placeholder="Choose a vault" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vaults.map((vault: any) => (
                            <SelectItem key={vault.id} value={vault.id}>
                              {vault.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {vaultId && (
                  <FormField
                    control={form.control}
                    name="objectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Select Document</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="text-foreground">
                              <SelectValue placeholder="Choose a document" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {objects.map((obj: any) => (
                              <SelectItem key={obj.id} value={obj.id}>
                                {obj.filename}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {/* Engine Selection */}
            <FormField
              control={form.control}
              name="engine"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">OCR Engine</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-foreground">
                        <SelectValue placeholder="Select engine" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="doctr">DocTR (Fast, printed text)</SelectItem>
                      <SelectItem value="tesseract">Tesseract (Handwriting)</SelectItem>
                      <SelectItem value="paddle">Paddle (Tables & forms)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-muted-foreground">
                    Choose based on your document type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Features */}
            <div className="space-y-3">
              <Label className="text-foreground">Additional Features</Label>

              <FormField
                control={form.control}
                name="enableEmbed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-foreground cursor-pointer font-normal">
                        Generate searchable PDF
                      </FormLabel>
                      <FormDescription className="text-muted-foreground">
                        Embed extracted text into PDF for search and copy
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableTables"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-foreground cursor-pointer font-normal">Extract tables</FormLabel>
                      <FormDescription className="text-muted-foreground">
                        Detect and extract tables as CSV
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Process Document"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
