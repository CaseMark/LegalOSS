"use client";

import { FileText, FolderLock, MoreVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VaultCardProps {
  vault: {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    objectCount: number;
    totalSize: string;
    status: string;
  };
  onClick: () => void;
}

export function VaultCard({ vault, onClick }: VaultCardProps) {
  return (
    <Card className="group cursor-pointer transition-all hover:shadow-md" onClick={onClick}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="bg-primary/10 flex size-10 flex-shrink-0 items-center justify-center rounded-lg">
            <FolderLock className="text-primary size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-foreground text-base font-medium">{vault.name}</CardTitle>
            <CardDescription className="text-muted-foreground line-clamp-2 text-sm">
              {vault.description || "No description"}
            </CardDescription>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="size-8 opacity-0 transition-opacity group-hover:opacity-100">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Upload Files</DropdownMenuItem>
            <DropdownMenuItem>Share</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <FileText className="text-muted-foreground size-4" />
              <span className="text-muted-foreground">{vault.objectCount || 0} files</span>
            </div>
            <div className="text-muted-foreground">{vault.totalSize || "0 B"}</div>
          </div>
          <Badge variant="secondary" className="capitalize">
            {vault.status}
          </Badge>
        </div>
        <div className="text-muted-foreground mt-2 text-xs">
          Created {new Date(vault.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}
