"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";

const formSchema = z
  .object({
    mode: z.enum(["url", "vault"]),
    audioUrl: z.string().optional(),
    filename: z.string().optional(),
    vaultId: z.string().optional(),
    objectId: z.string().optional(),
    languageCode: z.string().default("en"),
    speakerLabels: z.boolean().default(true),
    punctuate: z.boolean().default(true),
    formatText: z.boolean().default(true),
    wordBoost: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.mode === "url") return !!data.audioUrl;
      if (data.mode === "vault") return !!data.vaultId && !!data.objectId;
      return false;
    },
    { message: "Please provide all required fields", path: ["mode"] },
  );

interface SubmitTranscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SubmitTranscriptionDialog({ open, onOpenChange, onSuccess }: SubmitTranscriptionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: "url",
      audioUrl: "",
      filename: "",
      vaultId: "",
      objectId: "",
      languageCode: "en",
      speakerLabels: true,
      punctuate: true,
      formatText: true,
      wordBoost: "",
    },
  });

  const mode = form.watch("mode");
  const vaultId = form.watch("vaultId");

  const { data: vaultsData } = useSWR("/api/vaults", fetcher);
  const vaults = vaultsData?.vaults || [];

  const { data: objectsData } = useSWR(vaultId ? `/api/vaults/${vaultId}/objects` : null, fetcher);
  const objects = (objectsData?.objects || []).filter(
    (obj: any) =>
      obj.contentType?.startsWith("audio/") ||
      obj.contentType?.startsWith("video/") ||
      obj.filename?.match(/\.(mp3|m4a|wav|flac|mp4|mov|webm)$/i),
  );

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      const wordBoost = data.wordBoost
        ? data.wordBoost
            .split(",")
            .map((w) => w.trim())
            .filter(Boolean)
        : [];

      const payload =
        data.mode === "url"
          ? {
              audioUrl: data.audioUrl,
              filename: data.filename || "audio.mp3",
              languageCode: data.languageCode,
              speakerLabels: data.speakerLabels,
              punctuate: data.punctuate,
              formatText: data.formatText,
              wordBoost,
            }
          : {
              vaultId: data.vaultId,
              objectId: data.objectId,
              languageCode: data.languageCode,
              speakerLabels: data.speakerLabels,
              punctuate: data.punctuate,
              formatText: data.formatText,
              wordBoost,
            };

      const response = await fetch("/api/transcription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit transcription");
      }

      const result = await response.json();

      toast.success("Transcription job submitted", {
        description: `Processing ${data.filename || "audio"} (Job ID: ${result.id})`,
        duration: 5000,
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to submit transcription", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Transcribe Audio</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Convert audio or video files to accurate text transcripts with speaker identification
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Mode Selection */}
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Audio Source</FormLabel>
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
                  name="audioUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Audio URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/deposition.m4a"
                          {...field}
                          className="text-foreground"
                        />
                      </FormControl>
                      <FormDescription className="text-muted-foreground">
                        Publicly accessible URL to audio/video file (MP3, M4A, WAV, MP4, etc.)
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
                        <Input placeholder="deposition.m4a" {...field} className="text-foreground" />
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
                        <FormLabel className="text-foreground">Select Audio File</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="text-foreground">
                              <SelectValue placeholder="Choose an audio file" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {objects.length === 0 ? (
                              <div className="text-muted-foreground p-2 text-sm">No audio files found</div>
                            ) : (
                              objects.map((obj: any) => (
                                <SelectItem key={obj.id} value={obj.id}>
                                  {obj.filename}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-muted-foreground text-xs">
                          Only audio/video files are shown
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {/* Language Selection */}
            <FormField
              control={form.control}
              name="languageCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Language</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-foreground">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Options */}
            <div className="space-y-3">
              <Label className="text-foreground">Transcription Options</Label>

              <FormField
                control={form.control}
                name="speakerLabels"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-foreground cursor-pointer font-normal">Speaker labels</FormLabel>
                      <FormDescription className="text-muted-foreground">
                        Identify different speakers (great for depositions)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="punctuate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-foreground cursor-pointer font-normal">Add punctuation</FormLabel>
                      <FormDescription className="text-muted-foreground">
                        Adds periods, commas, question marks
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="formatText"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-foreground cursor-pointer font-normal">Smart formatting</FormLabel>
                      <FormDescription className="text-muted-foreground">
                        Capitalize sentences, format numbers and dates
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Word Boost */}
            <FormField
              control={form.control}
              name="wordBoost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Word Boost (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="plaintiff, defendant, negligence, objection"
                      className="text-foreground resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-muted-foreground">
                    Comma-separated legal terms to improve accuracy
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Transcribe"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
