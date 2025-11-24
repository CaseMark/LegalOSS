import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVaults } from "@/lib/hooks/use-vaults";
import { Skeleton } from "@/components/ui/skeleton";

interface VaultSelectorProps {
  selectedVaultIds: string[];
  onVaultToggle: (vaultId: string) => void;
}

interface Vault {
  id: string;
  name: string;
  description?: string;
}

export function VaultSelector({ selectedVaultIds, onVaultToggle }: VaultSelectorProps) {
  const { vaults, isLoading } = useVaults();

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Vaults</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
           <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Vaults</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {selectedVaultIds.length} selected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          <div className="p-4 pt-0 space-y-2">
            {vaults?.map((vault: Vault) => {
              const isSelected = selectedVaultIds.includes(vault.id);
              return (
                <div
                  key={vault.id}
                  onClick={() => onVaultToggle(vault.id)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50",
                    isSelected ? "border-primary bg-accent" : "bg-card"
                  )}
                >
                  <div
                    className={cn(
                      "mt-1 h-4 w-4 rounded-sm border border-primary flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "bg-primary text-primary-foreground" : "transparent"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-sm font-medium leading-none truncate">
                      {vault.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {vault.description || "No description"}
                    </p>
                  </div>
                </div>
              );
            })}
            {vaults?.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No vaults found
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
