"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { DEFAULT_USER_PERMISSIONS } from "@/lib/auth/permissions";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateGroupDialog({ open, onOpenChange, onSuccess }: CreateGroupDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState(DEFAULT_USER_PERMISSIONS);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const togglePermission = (service: string, permission: string) => {
    setPermissions((prev: any) => ({
      ...prev,
      [service]: {
        ...prev[service],
        [permission]: !prev[service][permission],
      },
    }));
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          permissions,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create group");
      }

      toast.success("Group created successfully", {
        description: `${data.name} is ready to assign to users`,
      });

      form.reset();
      setPermissions(DEFAULT_USER_PERMISSIONS);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to create group", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Custom Group</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a team like "Paralegals", "Partners", or "Associates" with custom permissions
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Group Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Paralegals, Partners, Associates"
                      {...field}
                      className="text-foreground"
                    />
                  </FormControl>
                  <FormDescription className="text-muted-foreground">
                    A descriptive name for this team or role
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this group's purpose..."
                      className="text-foreground resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Quick Permissions */}
            <div className="space-y-4">
              <Label className="text-foreground text-sm font-medium">Permissions</Label>

              <div className="bg-muted/30 space-y-3 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium">Vaults</p>
                    <p className="text-muted-foreground text-xs">Document storage and management</p>
                  </div>
                  <Checkbox
                    checked={permissions.vaults.create && permissions.vaults.read}
                    onCheckedChange={(checked) => {
                      setPermissions((prev: any) => ({
                        ...prev,
                        vaults: {
                          create: checked,
                          read: checked,
                          update: checked,
                          delete: false,
                          upload: checked,
                          download: checked,
                          search: checked,
                        },
                      }));
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium">OCR & Transcription</p>
                    <p className="text-muted-foreground text-xs">Process documents and audio</p>
                  </div>
                  <Checkbox
                    checked={permissions.ocr.create && permissions.transcription.create}
                    onCheckedChange={(checked) => {
                      setPermissions((prev: any) => ({
                        ...prev,
                        ocr: { create: checked, read: checked, evaluate: checked, download: checked },
                        transcription: { create: checked, read: checked, streaming: checked, download: checked },
                      }));
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium">AI Chat & TTS</p>
                    <p className="text-muted-foreground text-xs">Use AI models and voice synthesis</p>
                  </div>
                  <Checkbox
                    checked={permissions.chat_ai.use && permissions.tts.use}
                    onCheckedChange={(checked) => {
                      setPermissions((prev: any) => ({
                        ...prev,
                        chat_ai: { use: checked, change_model: checked, change_settings: checked },
                        tts: { use: checked, download: checked },
                      }));
                    }}
                  />
                </div>
              </div>

              <p className="text-muted-foreground text-xs">
                💡 Fine-tune permissions after creation in the Permissions page
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
