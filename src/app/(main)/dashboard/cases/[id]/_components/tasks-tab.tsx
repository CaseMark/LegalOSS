"use client";

import { useState } from "react";
import { Plus, CheckSquare, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TasksTabProps {
  caseId: string;
  tasks: any[];
  onUpdate: () => void;
}

export function TasksTab({ caseId, tasks, onUpdate }: TasksTabProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: usersData } = useSWR("/api/users", fetcher);
  const users = usersData?.users || [];

  const handleAddTask = async () => {
    if (!title) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/cases/${caseId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          dueDate: dueDate?.toISOString(),
          priority,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      toast.success("Task created");
      setShowAddTask(false);
      setTitle("");
      setDescription("");
      setDueDate(undefined);
      onUpdate();
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTaskComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";

    try {
      await fetch(`/api/cases/${caseId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });

      onUpdate();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
      case "high":
        return <AlertTriangle className="size-4 text-red-500" />;
      case "medium":
        return <Clock className="size-4 text-yellow-500" />;
      default:
        return <Clock className="text-muted-foreground size-4" />;
    }
  };

  const pendingTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground text-lg font-medium">Tasks & Deadlines</h3>
          <p className="text-muted-foreground text-sm">
            {pendingTasks.length} pending, {completedTasks.length} completed
          </p>
        </div>
        <Button onClick={() => setShowAddTask(true)}>
          <Plus className="mr-2 size-4" />
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckSquare className="text-muted-foreground mb-4 size-12" />
            <h3 className="text-foreground text-lg font-medium">No tasks yet</h3>
            <p className="text-muted-foreground mb-4 text-sm">Create tasks to track work items and deadlines</p>
            <Button onClick={() => setShowAddTask(true)}>
              <Plus className="mr-2 size-4" />
              Create First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-foreground text-sm font-medium">Pending ({pendingTasks.length})</h4>
              <div className="space-y-2">
                {pendingTasks.map((task: any) => (
                  <Card key={task.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => toggleTaskComplete(task.id, task.status)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-foreground font-medium">{task.title}</p>
                            {getPriorityIcon(task.priority)}
                            <Badge variant="outline" className="text-xs capitalize">
                              {task.priority}
                            </Badge>
                          </div>
                          {task.description && <p className="text-muted-foreground text-sm">{task.description}</p>}
                          {task.dueDate && (
                            <p className="text-muted-foreground text-xs">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-muted-foreground text-sm font-medium">Completed ({completedTasks.length})</h4>
              <div className="space-y-2">
                {completedTasks.map((task: any) => (
                  <Card key={task.id} className="opacity-60">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={true}
                          onCheckedChange={() => toggleTaskComplete(task.id, task.status)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="text-foreground font-medium line-through">{task.title}</p>
                          {task.completedAt && (
                            <p className="text-muted-foreground mt-1 text-xs">
                              Completed: {new Date(task.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Task</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a new work item or deadline to track
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Draft motion to dismiss"
                className="text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task details..."
                className="text-foreground resize-none"
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 size-4" />
                      {dueDate ? format(dueDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTask(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
