"use client";

import { useState } from "react";
import { Plus, Calendar, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface TimelineTabProps {
  caseId: string;
  events: any[];
  onUpdate: () => void;
}

export function TimelineTab({ caseId, events, onUpdate }: TimelineTabProps) {
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventDate, setEventDate] = useState<Date | undefined>(new Date());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("incident");
  const [importance, setImportance] = useState("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddEvent = async () => {
    if (!eventDate || !title) {
      toast.error("Event date and title are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/cases/${caseId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventDate: eventDate.toISOString(),
          title,
          description,
          eventType,
          importance,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add event");
      }

      toast.success("Event added to timeline");
      setShowAddEvent(false);
      setTitle("");
      setDescription("");
      setEventDate(new Date());
      onUpdate();
    } catch (error) {
      toast.error("Failed to add event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedEvents = [...events].sort((a, b) => {
    return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case "filing":
        return <FileText className="size-4" />;
      case "hearing":
        return <Calendar className="size-4" />;
      default:
        return <AlertCircle className="size-4" />;
    }
  };

  const getImportanceBadge = (importance: string) => {
    const variants: Record<string, any> = {
      critical: "destructive",
      high: "default",
      normal: "secondary",
      low: "outline",
    };
    return <Badge variant={variants[importance] || "secondary"}>{importance}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground text-lg font-medium">Timeline of Events</h3>
          <p className="text-muted-foreground text-sm">Chronological record of case events</p>
        </div>
        <Button onClick={() => setShowAddEvent(true)}>
          <Plus className="mr-2 size-4" />
          Add Event
        </Button>
      </div>

      {sortedEvents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="text-muted-foreground mb-4 size-12" />
            <h3 className="text-foreground text-lg font-medium">No events yet</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Start building your case chronology by adding key events
            </p>
            <Button onClick={() => setShowAddEvent(true)}>
              <Plus className="mr-2 size-4" />
              Add First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedEvents.map((event: any) => (
            <Card key={event.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="text-muted-foreground mt-1">{getEventIcon(event.eventType)}</div>
                    <div>
                      <CardTitle className="text-foreground text-base">{event.title}</CardTitle>
                      <CardDescription className="mt-1 text-sm">
                        {new Date(event.eventDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getImportanceBadge(event.importance)}
                    {event.eventType && (
                      <Badge variant="outline" className="capitalize">
                        {event.eventType}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              {event.description && (
                <CardContent>
                  <p className="text-foreground text-sm">{event.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Event Dialog */}
      <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Timeline Event</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Record an important event in the case chronology
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Event Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 size-4" />
                    {eventDate ? format(eventDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent mode="single" selected={eventDate} onSelect={setEventDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Complaint filed"
                className="text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details..."
                className="text-foreground resize-none"
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Event Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incident">Incident</SelectItem>
                    <SelectItem value="filing">Filing</SelectItem>
                    <SelectItem value="hearing">Hearing</SelectItem>
                    <SelectItem value="deposition">Deposition</SelectItem>
                    <SelectItem value="discovery">Discovery</SelectItem>
                    <SelectItem value="settlement_offer">Settlement Offer</SelectItem>
                    <SelectItem value="verdict">Verdict</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Importance</Label>
                <Select value={importance} onValueChange={setImportance}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEvent(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddEvent} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
