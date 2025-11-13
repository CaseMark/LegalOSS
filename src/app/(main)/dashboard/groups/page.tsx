"use client";

import { useState } from "react";
import { Users, Shield, Plus } from "lucide-react";
import useSWR from "swr";
import { useSession } from "next-auth/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreateGroupDialog } from "./_components/create-group-dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function GroupsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: session } = useSession();
  const { data, isLoading, mutate } = useSWR("/api/groups", fetcher);
  const groups = data?.groups || [];

  if (session?.user && (session.user as any).role !== "admin") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You need administrator privileges to manage groups.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground mt-1">
            Create custom teams like "Paralegals", "Partners", or "Associates" with tailored permissions
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 size-4" />
          Create Group
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center py-12">Loading groups...</div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="text-muted-foreground mb-4 size-12" />
              <h3 className="text-foreground text-lg font-medium">No groups yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md text-center text-sm">
                Create custom groups like "Paralegals" or "Partners" to manage permissions for teams
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 size-4" />
                Create First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group: any) => (
              <Card key={group.id} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-foreground">{group.name}</CardTitle>
                      <CardDescription className="text-muted-foreground mt-1">
                        {group.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      <Shield className="mr-1 size-3" />
                      Custom
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs">Active Permissions:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(group.permissions || {}).map(([service, perms]: any) => {
                        const enabledCount = Object.values(perms).filter(Boolean).length;
                        if (enabledCount > 0) {
                          return (
                            <Badge key={service} variant="secondary" className="text-xs">
                              {service}: {enabledCount}
                            </Badge>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-foreground">About Groups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Groups allow you to create custom teams with specific permission sets. Perfect for law firms, corporate
              legal departments, or any organization with different roles.
            </p>
            <div className="bg-muted/30 space-y-2 rounded-lg p-4">
              <p className="text-foreground font-medium">Example Groups:</p>
              <ul className="text-muted-foreground list-inside list-disc space-y-1">
                <li>
                  <span className="font-medium">Partners</span> - Full access to all services
                </li>
                <li>
                  <span className="font-medium">Associates</span> - Can create/edit but not delete
                </li>
                <li>
                  <span className="font-medium">Paralegals</span> - Upload and process documents only
                </li>
                <li>
                  <span className="font-medium">Analysts</span> - Read-only access for research
                </li>
              </ul>
            </div>
            <p className="text-muted-foreground text-xs">
              Users can be members of multiple groups, and the most permissive permission always wins.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          mutate();
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}
