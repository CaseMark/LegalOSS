"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Action } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Play, Pencil, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export const columns: ColumnDef<Action>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.getValue("name")}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
            {row.original.description}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "webhook_id",
    header: "Trigger",
    cell: ({ row }) => {
      const webhookId = row.getValue("webhook_id") as string;
      return webhookId ? (
        <Badge variant="outline" className="font-mono text-xs">
          Webhook
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-xs">
          Manual
        </Badge>
      );
    },
  },
  {
    accessorKey: "steps",
    header: "Steps",
    cell: ({ row }) => {
      return (
        <Badge variant="secondary" className="font-mono">
          {row.original.definition.steps.length}
        </Badge>
      );
    },
  },
  {
    accessorKey: "updated_at",
    header: "Last Updated",
    cell: ({ row }) => {
      return (
        <span className="text-sm text-muted-foreground">
          {new Date(row.getValue("updated_at")).toLocaleDateString()}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const action = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
              <Play className="mr-2 h-4 w-4" />
              Run Action
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/actions/${action.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];



