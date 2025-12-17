import { FolderLock, FileText, Database } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import {
  caseDevApiToolOptions,
  legacyToolOptions,
  allToolOptions,
  defaultEnabledToolState,
  type ToolOption,
} from "./tool-options";

const autoEnabledTools = [
  {
    label: "List Vault Files",
    description: "Auto-enabled when vaults selected",
    icon: FolderLock,
  },
  {
    label: "Get File Info",
    description: "Auto-enabled when vaults selected",
    icon: FileText,
  },
  {
    label: "Organize by Content",
    description: "Auto-enabled when vaults selected",
    icon: Database,
  },
];

interface ToolsConfigProps {
  enabledTools: Record<string, boolean>;
  onToolToggle: (toolName: string, enabled: boolean) => void;
  vaults: any[];
  selectedVaults: string[];
  onVaultsChange: (vaults: string[]) => void;
}

export function ToolsConfig({ enabledTools, onToolToggle, vaults, selectedVaults, onVaultsChange }: ToolsConfigProps) {
  const isToolEnabled = (toolName: string) => enabledTools[toolName] ?? defaultEnabledToolState[toolName] ?? false;

  const toggleableTools = allToolOptions.filter((tool) => tool.status !== "coming_soon");
  const enabledCount = toggleableTools.filter((tool) => isToolEnabled(tool.name)).length;

  const availableVaults = vaults.filter((v: any) => v.objectCount > 0);
  const showVaultSelection = allToolOptions.some((tool) => tool.requiresVaultSelection && isToolEnabled(tool.name));

  const handleVaultToggle = (vaultId: string, checked: boolean) => {
    if (checked) {
      onVaultsChange([...selectedVaults, vaultId]);
    } else {
      onVaultsChange(selectedVaults.filter((id) => id !== vaultId));
    }
  };

  const renderToolList = (tools: ToolOption[]) => (
    <div className="space-y-2">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isEnabled = isToolEnabled(tool.name);
        const isAvailable = tool.status !== "coming_soon";

        return (
          <div key={tool.name} className="flex items-start gap-2 rounded-md border p-2">
            <div className="flex flex-1 items-center gap-2">
              <Checkbox
                id={`tool-${tool.name}`}
                checked={isEnabled}
                onCheckedChange={(checked) => onToolToggle(tool.name, checked as boolean)}
                disabled={!isAvailable}
              />
              <Icon className={`size-4 flex-shrink-0 ${isEnabled ? "text-primary" : "text-muted-foreground"}`} />
              <div className="min-w-0 flex-1">
                <Label
                  htmlFor={`tool-${tool.name}`}
                  className={`cursor-pointer text-xs font-medium ${!isAvailable && "text-muted-foreground"}`}
                >
                  {tool.label}
                </Label>
                <p className="text-muted-foreground mt-0.5 text-[10px] leading-tight">{tool.description}</p>
                {tool.requiresVaultSelection && (
                  <p className="text-muted-foreground mt-1 text-[10px]">Needs vault selection</p>
                )}
                {!isAvailable && (
                  <Badge variant="outline" className="mt-1 px-1 py-0 text-[10px]">
                    Coming Soon
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Available Tools</CardTitle>
        <CardDescription className="text-xs">
          {enabledCount} of {toggleableTools.length} tools enabled
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showVaultSelection && (
          <div className="bg-muted/30 space-y-2 rounded-md border border-dashed p-3">
            <div className="flex items-center gap-2">
              <FolderLock className="text-primary size-4" />
              <Label className="text-xs font-medium tracking-wide uppercase">Vault Scope</Label>
            </div>
            {availableVaults.length === 0 ? (
              <p className="text-muted-foreground text-[10px] leading-tight">
                No vaults with documents. Create a vault and upload files first.
              </p>
            ) : (
              <div className="space-y-1.5">
                {availableVaults.map((vault: any) => (
                  <div key={vault.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`vault-${vault.id}`}
                      checked={selectedVaults.includes(vault.id)}
                      onCheckedChange={(checked) => handleVaultToggle(vault.id, checked as boolean)}
                    />
                    <Label htmlFor={`vault-${vault.id}`} className="flex-1 cursor-pointer text-xs leading-tight">
                      {vault.name}
                      <span className="text-muted-foreground ml-1 text-[10px]">
                        ({vault.objectCount} {vault.objectCount === 1 ? "doc" : "docs"})
                      </span>
                    </Label>
                  </div>
                ))}
                <p className="text-muted-foreground mt-2 text-[10px]">
                  {selectedVaults.length} vault{selectedVaults.length !== 1 ? "s" : ""} selected
                </p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div>
            <Label className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              Case.dev API tools
            </Label>
            <p className="text-muted-foreground text-[10px]">
              These hit the live Case.dev API surface and power the main demo. Toggle off to keep the agent scoped.
            </p>
          </div>
          {renderToolList(caseDevApiToolOptions)}
        </div>

        <div className="space-y-2">
          <div>
            <Label className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              Legacy demo tools
            </Label>
            <p className="text-muted-foreground text-[10px]">
              Older demo endpoints kept around for backwards compatibility. Prefer Case.dev tools above.
            </p>
          </div>
          {renderToolList(legacyToolOptions)}
        </div>

        {/* Auto-enabled tools when vaults selected */}
        {selectedVaults.length > 0 && (
          <>
            <div className="mt-2 border-t pt-2">
              <Label className="text-muted-foreground text-[10px]">Auto-Enabled (Vault Filesystem)</Label>
            </div>
            {autoEnabledTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <div key={tool.label} className="flex items-start gap-2 rounded-md border border-dashed p-2 opacity-60">
                  <Icon className="text-primary size-4 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Label className="text-xs font-medium">{tool.label}</Label>
                    <p className="text-muted-foreground mt-0.5 text-[10px] leading-tight">{tool.description}</p>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
