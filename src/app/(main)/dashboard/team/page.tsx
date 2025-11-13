"use client";

import { useState } from "react";
import { Users as UsersIcon, Shield, User, Clock, UserPlus } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AddUserDialog } from "./_components/add-user-dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TeamPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { data: session } = useSession();
  const { data, isLoading, mutate } = useSWR("/api/users", fetcher);
  const users = data?.users || [];

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }

      toast.success("Role updated successfully");
      mutate();
    } catch (error) {
      toast.error("Failed to update role", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      admin: "default",
      user: "secondary",
      pending: "outline",
    };

    const icons: Record<string, any> = {
      admin: Shield,
      user: User,
      pending: Clock,
    };

    const Icon = icons[role] || User;

    return (
      <Badge variant={variants[role] || "outline"} className="capitalize">
        <Icon className="mr-1 size-3" />
        {role}
      </Badge>
    );
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (session?.user && (session.user as any).role !== "admin") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You need administrator privileges to access team management.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground mt-1">Manage users, roles, and permissions for your Legal AI instance</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="mr-2 size-4" />
          Add User
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Users</CardTitle>
            <CardDescription className="text-muted-foreground">
              {users.length} total user{users.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground flex items-center justify-center py-12">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground">User</TableHead>
                    <TableHead className="text-muted-foreground">Role</TableHead>
                    <TableHead className="text-muted-foreground">Last Active</TableHead>
                    <TableHead className="text-muted-foreground">Joined</TableHead>
                    <TableHead className="text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium">{user.name}</span>
                          <span className="text-muted-foreground text-xs">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {session && (session.user as any).id === user.id ? (
                          getRoleBadge(user.role)
                        ) : (
                          <Select value={user.role} onValueChange={(value) => handleRoleChange(user.id, value)}>
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="size-3" />
                                  Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="user">
                                <div className="flex items-center gap-2">
                                  <User className="size-3" />
                                  User
                                </div>
                              </SelectItem>
                              <SelectItem value="pending">
                                <div className="flex items-center gap-2">
                                  <Clock className="size-3" />
                                  Pending
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(user.lastActiveAt)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        {session && (session.user as any).id !== user.id && (
                          <Button variant="ghost" size="sm" disabled>
                            Deactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Role Descriptions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-foreground">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="text-primary size-4" />
                <span className="text-foreground font-medium">Admin</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Full access to all features, can manage users and settings, view audit logs
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="text-primary size-4" />
                <span className="text-foreground font-medium">User</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Can use all AI services (Vaults, OCR, Transcription, Chat, TTS), create and manage own resources
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground size-4" />
                <span className="text-foreground font-medium">Pending</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Limited access, waiting for admin approval. Cannot create resources.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <AddUserDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          mutate();
          setShowAddDialog(false);
        }}
      />
    </div>
  );
}
