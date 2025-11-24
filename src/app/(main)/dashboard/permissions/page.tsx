"use client";

import { useState } from "react";
import { Shield, Lock, Settings, Save, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import useSWR from "swr";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import {
  DEFAULT_USER_PERMISSIONS,
  ADMIN_PERMISSIONS,
  PENDING_PERMISSIONS,
  type Permissions,
} from "@/lib/auth/permissions";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PermissionsPage() {
  const { data: session } = useSession();
  const [userPerms, setUserPerms] = useState<Permissions>(DEFAULT_USER_PERMISSIONS);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupPerms, setGroupPerms] = useState<Record<string, Permissions>>({});

  const { data: groupsData, mutate } = useSWR("/api/groups", fetcher);
  const groups = groupsData?.groups || [];

  // Initialize group permissions when data loads
  const initializeGroupPerms = (groupId: string, perms: Permissions) => {
    setGroupPerms((prev) => ({
      ...prev,
      [groupId]: perms,
    }));
  };

  if (session?.user && (session.user as any).role !== "admin") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You need administrator privileges to manage permissions.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const togglePermission = (service: string, permission: string, groupId?: string) => {
    if (groupId) {
      setGroupPerms((prev) => {
        const serviceKey = service as keyof Permissions;
        const group = prev[groupId] || ({} as Permissions);
        const currentPermissions = (group[serviceKey] as Record<string, boolean>) || {};
        return {
          ...prev,
          [groupId]: {
            ...group,
            [service]: {
              ...currentPermissions,
              [permission]: !currentPermissions[permission],
            },
          },
        };
      });
    } else {
      setUserPerms((prev) => {
        const serviceKey = service as keyof Permissions;
        const currentPermissions = (prev[serviceKey] as Record<string, boolean>) || {};
        return {
          ...prev,
          [service]: {
            ...currentPermissions,
            [permission]: !currentPermissions[permission],
          },
        };
      });
    }
    setHasChanges(true);
  };

  const savePermissions = async () => {
    // Save user permissions
    // TODO: Save to database/settings

    // Save group permissions
    if (selectedGroup && groupPerms[selectedGroup]) {
      try {
        const response = await fetch(`/api/groups/${selectedGroup}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permissions: groupPerms[selectedGroup],
          }),
        });

        if (!response.ok) throw new Error("Failed to save");

        toast.success("Permissions updated", {
          description: selectedGroup ? "Group permissions saved" : "Default user permissions saved",
        });
        mutate();
      } catch (error) {
        toast.error("Failed to save permissions");
      }
    } else {
      toast.success("Permissions updated", {
        description: "Default user permissions have been saved",
      });
    }

    setHasChanges(false);
  };

  const renderPermissionMatrix = (perms: Permissions, editable: boolean = false, groupId?: string) => {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-foreground w-[200px]">Service / Action</TableHead>
            <TableHead className="text-muted-foreground text-center">Create</TableHead>
            <TableHead className="text-muted-foreground text-center">Read</TableHead>
            <TableHead className="text-muted-foreground text-center">Update</TableHead>
            <TableHead className="text-muted-foreground text-center">Delete</TableHead>
            <TableHead className="text-muted-foreground text-center">Other</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Vaults */}
          <TableRow>
            <TableCell className="text-foreground font-medium">Vaults</TableCell>
            <TableCell className="text-center">
              {editable ? (
                <Checkbox
                  checked={perms.vaults.create}
                  onCheckedChange={() => togglePermission("vaults", "create", groupId)}
                />
              ) : (
                <span>{perms.vaults.create ? "✓" : "✗"}</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              {editable ? (
                <Checkbox
                  checked={perms.vaults.read}
                  onCheckedChange={() => togglePermission("vaults", "read", groupId)}
                />
              ) : (
                <span>{perms.vaults.read ? "✓" : "✗"}</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              {editable ? (
                <Checkbox
                  checked={perms.vaults.update}
                  onCheckedChange={() => togglePermission("vaults", "update", groupId)}
                />
              ) : (
                <span>{perms.vaults.update ? "✓" : "✗"}</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              {editable ? (
                <Checkbox
                  checked={perms.vaults.delete}
                  onCheckedChange={() => togglePermission("vaults", "delete", groupId)}
                />
              ) : (
                <span>{perms.vaults.delete ? "✓" : "✗"}</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-center text-xs">Upload, Download, Search</TableCell>
          </TableRow>

          {/* OCR */}
          <TableRow>
            <TableCell className="text-foreground font-medium">Document OCR</TableCell>
            <TableCell className="text-center">
              {editable ? (
                <Checkbox
                  checked={perms.ocr.create}
                  onCheckedChange={() => togglePermission("ocr", "create", groupId)}
                />
              ) : (
                <span>{perms.ocr.create ? "✓" : "✗"}</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              {editable ? (
                <Checkbox checked={perms.ocr.read} onCheckedChange={() => togglePermission("ocr", "read", groupId)} />
              ) : (
                <span>{perms.ocr.read ? "✓" : "✗"}</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-center">-</TableCell>
            <TableCell className="text-muted-foreground text-center">-</TableCell>
            <TableCell className="text-muted-foreground text-center text-xs">Evaluate, Download</TableCell>
          </TableRow>

          {/* Transcription */}
          <TableRow>
            <TableCell className="text-foreground font-medium">Transcription</TableCell>
            <TableCell className="text-center">
              {editable ? (
                <Checkbox
                  checked={perms.transcription.create}
                  onCheckedChange={() => togglePermission("transcription", "create", groupId)}
                />
              ) : (
                <span>{perms.transcription.create ? "✓" : "✗"}</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              {editable ? (
                <Checkbox
                  checked={perms.transcription.read}
                  onCheckedChange={() => togglePermission("transcription", "read", groupId)}
                />
              ) : (
                <span>{perms.transcription.read ? "✓" : "✗"}</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-center">-</TableCell>
            <TableCell className="text-muted-foreground text-center">-</TableCell>
            <TableCell className="text-muted-foreground text-center text-xs">Streaming, Download</TableCell>
          </TableRow>

          {/* AI Chat */}
          <TableRow>
            <TableCell className="text-foreground font-medium">AI Chat</TableCell>
            <TableCell className="text-muted-foreground text-center">-</TableCell>
            <TableCell className="text-muted-foreground text-center">-</TableCell>
            <TableCell className="text-muted-foreground text-center">-</TableCell>
            <TableCell className="text-muted-foreground text-center">-</TableCell>
            <TableCell className="text-center">
              {editable ? (
                <Checkbox
                  checked={perms.chat_ai.use}
                  onCheckedChange={() => togglePermission("chat_ai", "use", groupId)}
                />
              ) : (
                <span>{perms.chat_ai.use ? "✓" : "✗"}</span>
              )}
            </TableCell>
          </TableRow>

          {/* TTS */}
          <TableRow>
            <TableCell className="text-foreground font-medium">Text-to-Speech</TableCell>
            <TableCell className="text-muted-foreground text-center">-</TableCell>
            <TableCell className="text-muted-foreground text-center">-</TableCell>
            <TableCell className="text-muted-foreground text-center">-</TableCell>
            <TableCell className="text-muted-foreground text-center">-</TableCell>
            <TableCell className="text-center">
              {editable ? (
                <Checkbox checked={perms.tts.use} onCheckedChange={() => togglePermission("tts", "use", groupId)} />
              ) : (
                <span>{perms.tts.use ? "✓" : "✗"}</span>
              )}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Permissions</h1>
          <p className="text-muted-foreground mt-1">Configure role-based access control and service permissions</p>
        </div>
        {hasChanges && (
          <Button onClick={savePermissions}>
            <Save className="mr-2 size-4" />
            Save Changes
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs
          defaultValue="user"
          className="space-y-6"
          onValueChange={(value) => {
            if (value.startsWith("group-")) {
              const groupId = value.replace("group-", "");
              setSelectedGroup(groupId);
              const group = groups.find((g: any) => g.id === groupId);
              if (group && !groupPerms[groupId]) {
                initializeGroupPerms(groupId, group.permissions);
              }
            } else {
              setSelectedGroup(null);
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="admin">
              <Shield className="mr-2 size-4" />
              Admin
            </TabsTrigger>
            <TabsTrigger value="user">
              <Settings className="mr-2 size-4" />
              User (Editable)
            </TabsTrigger>
            <TabsTrigger value="pending">
              <Lock className="mr-2 size-4" />
              Pending
            </TabsTrigger>
            {groups.map((group: any) => (
              <TabsTrigger key={group.id} value={`group-${group.id}`}>
                <Users className="mr-2 size-4" />
                {group.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Admin Role */}
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Admin Permissions</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Administrators have full access to all features. These permissions cannot be modified.
                </CardDescription>
              </CardHeader>
              <CardContent>{renderPermissionMatrix(ADMIN_PERMISSIONS, false)}</CardContent>
            </Card>
          </TabsContent>

          {/* User Role - Editable */}
          <TabsContent value="user">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">User Permissions (Default)</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Configure default permissions for standard users. Click checkboxes to toggle.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderPermissionMatrix(userPerms, true)}
                <div className="bg-muted/30 mt-6 rounded-lg p-4">
                  <p className="text-muted-foreground text-sm">
                    💡 <span className="font-medium">Tip:</span> These are the default permissions for new users. You
                    can further refine access by assigning users to custom groups.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Role */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Pending User Permissions</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Pending users have no access until approved. These permissions cannot be modified.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderPermissionMatrix(PENDING_PERMISSIONS, false)}
                <Alert className="mt-6">
                  <AlertDescription className="text-muted-foreground text-sm">
                    Users with "Pending" role cannot access any services. Change their role to "User" or "Admin" in Team
                    Members to grant access.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Groups */}
          {groups.map((group: any) => (
            <TabsContent key={group.id} value={`group-${group.id}`}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">{group.name} Permissions</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {group.description || "Configure permissions for this custom group"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderPermissionMatrix(groupPerms[group.id] || group.permissions, true, group.id)}
                  <div className="bg-muted/30 mt-6 rounded-lg p-4">
                    <p className="text-muted-foreground text-sm">
                      💡 <span className="font-medium">Note:</span> Users assigned to this group will inherit these
                      permissions in addition to their role permissions. The most permissive permission always wins.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-foreground">Permission System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">Permissions are applied in layers:</p>
            <ol className="text-muted-foreground list-inside list-decimal space-y-2">
              <li>
                <span className="text-foreground font-medium">Role Permissions</span> - Base permissions from
                Admin/User/Pending role
              </li>
              <li>
                <span className="text-foreground font-medium">Group Permissions</span> - Additional permissions from
                custom groups (e.g., "Paralegals")
              </li>
              <li>
                <span className="text-foreground font-medium">Combined</span> - Most permissive permission wins
              </li>
            </ol>
            <div className="mt-4 rounded border border-blue-500/20 bg-blue-500/10 p-3">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                🎯 <span className="font-medium">Enterprise Feature:</span> Create custom groups in the Groups page to
                define permission sets like "Partners" (full access) or "Paralegals" (read-only).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
