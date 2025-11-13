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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  caseType: z.string(),
  jurisdiction: z.string().optional(),
  courtName: z.string().optional(),
  officialCaseNumber: z.string().optional(),
  trialDate: z.date().optional(),
  estimatedValue: z.string().optional(),
  visibility: z.enum(["private", "team", "organization"]).default("private"),
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCaseDialog({ open, onOpenChange, onSuccess }: CreateCaseDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const { data: groupsData } = useSWR("/api/groups", fetcher);
  const groups = groupsData?.groups || [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      caseType: "personal_injury",
      jurisdiction: "",
      courtName: "",
      officialCaseNumber: "",
      visibility: "private",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          estimatedValue: data.estimatedValue ? parseInt(data.estimatedValue) : null,
          trialDate: data.trialDate?.toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create case");
      }

      toast.success("Case created successfully", {
        description: `Case #${result.caseNumber} - ${data.title}`,
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to create case", {
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
          <DialogTitle className="text-foreground">Create New Case</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set up a new matter to track documents, deadlines, and case progress
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Case Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Smith v. Jones Hospital" {...field} className="text-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief case summary..."
                      className="text-foreground resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="caseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Case Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="personal_injury">Personal Injury</SelectItem>
                        <SelectItem value="contract">Contract Dispute</SelectItem>
                        <SelectItem value="employment">Employment</SelectItem>
                        <SelectItem value="family">Family Law</SelectItem>
                        <SelectItem value="criminal">Criminal Defense</SelectItem>
                        <SelectItem value="real_estate">Real Estate</SelectItem>
                        <SelectItem value="intellectual_property">Intellectual Property</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jurisdiction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Jurisdiction</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Federal - N.D. Cal" {...field} className="text-foreground" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="courtName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Court Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Superior Court of California" {...field} className="text-foreground" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="officialCaseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Official Case #</FormLabel>
                    <FormControl>
                      <Input placeholder="CV-2024-001234" {...field} className="text-foreground" />
                    </FormControl>
                    <FormDescription className="text-muted-foreground">Court's case number</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="trialDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-foreground">Trial Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${
                            !field.value && "text-muted-foreground"
                          }`}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {field.value ? format(field.value, "PPP") : "Select date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Visibility</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="private">Private - Only you and selected users/groups</SelectItem>
                      <SelectItem value="team">Team - Selected groups only</SelectItem>
                      <SelectItem value="organization">Organization - All users can view</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-muted-foreground">Control who can access this case</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Case"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
