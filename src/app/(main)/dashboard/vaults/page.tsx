"use client";

import { useState, useEffect } from "react";
import { FolderLock, Plus, Search, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVaultsWithStats } from "@/lib/hooks/use-vault-stats";

import { CreateVaultDialog } from "./_components/create-vault-dialog";
import { VaultCard } from "./_components/vault-card";
import { VaultDetails } from "./_components/vault-details";

interface Vault {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  objectCount?: number;
  totalSize?: string;
  totalSizeBytes?: number;
  status: string;
}

export default function VaultsPage() {
  const [selectedVault, setSelectedVault] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { vaults, isLoading, mutate } = useVaultsWithStats();

  // Helper function for formatting bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  useEffect(() => {
    // Listen for vault created event
    const handleVaultCreated = () => {
      console.log("Vault created event received, revalidating...");
      mutate();
    };

    window.addEventListener("vault-created", handleVaultCreated);
    return () => window.removeEventListener("vault-created", handleVaultCreated);
  }, [mutate]);

  const filteredVaults = vaults.filter(
    (vault) =>
      vault.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vault.description && vault.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vaults</h1>
          <p className="text-muted-foreground mt-1">Secure document storage with AI-powered semantic search</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 size-4" />
          Create Vault
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        <Tabs defaultValue="all" className="flex h-full flex-col">
          <div className="mb-4 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All Vaults</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="shared">Shared</TabsTrigger>
            </TabsList>

            <div className="relative w-72">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search vaults..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <TabsContent value="all" className="mt-0 flex-1 space-y-4 overflow-auto">
            {selectedVault ? (
              <VaultDetails vaultId={selectedVault} onBack={() => setSelectedVault(null)} />
            ) : isLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Loading vaults...</div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="mb-6 grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-foreground text-sm font-medium">Total Vaults</CardTitle>
                      <FolderLock className="text-muted-foreground size-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-foreground text-2xl font-bold">{vaults.length}</div>
                      <p className="text-muted-foreground text-xs">Across all workspaces</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-foreground text-sm font-medium">Total Documents</CardTitle>
                      <Upload className="text-muted-foreground size-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-foreground text-2xl font-bold">
                        {vaults.reduce((acc, vault) => acc + (vault.objectCount || 0), 0)}
                      </div>
                      <p className="text-muted-foreground text-xs">Files stored securely</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-foreground text-sm font-medium">Total Storage</CardTitle>
                      <FolderLock className="text-muted-foreground size-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-foreground text-2xl font-bold">
                        {formatBytes(vaults.reduce((sum, v) => sum + (v.totalSizeBytes || 0), 0))}
                      </div>
                      <p className="text-muted-foreground text-xs">Encrypted storage used</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Vaults Grid */}
                {filteredVaults.length === 0 ? (
                  <Card className="flex flex-col items-center justify-center py-16">
                    <FolderLock className="text-muted-foreground mb-4 size-12" />
                    <h3 className="text-lg font-medium">No vaults found</h3>
                    <p className="text-muted-foreground mb-4 text-sm">
                      {searchQuery ? "Try adjusting your search" : "Create your first vault to get started"}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="mr-2 size-4" />
                        Create Vault
                      </Button>
                    )}
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredVaults.map((vault) => (
                      <VaultCard key={vault.id} vault={vault} onClick={() => setSelectedVault(vault.id)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="recent" className="flex-1">
            <Card>
              <CardHeader>
                <CardTitle>Recent Vaults</CardTitle>
                <CardDescription>Vaults you've accessed recently</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">No recent activity</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shared" className="flex-1">
            <Card>
              <CardHeader>
                <CardTitle>Shared Vaults</CardTitle>
                <CardDescription>Vaults shared with you by others</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">No shared vaults</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Vault Dialog */}
      <CreateVaultDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
}
