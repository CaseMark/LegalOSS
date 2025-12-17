"use client";

import { useState, useEffect } from "react";

import { Check, ChevronsUpDown, Database, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Vault {
  id: string;
  name: string;
  description?: string;
  objectCount?: number;
}

interface VaultSelectorProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  className?: string;
}

export function VaultSelector({ value, onValueChange, className }: VaultSelectorProps) {
  const [open, setOpen] = useState(false);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchVaults() {
      try {
        const response = await fetch("/api/vaults");
        if (response.ok) {
          const data = await response.json();
          setVaults(data.vaults || []);
        }
      } catch (err) {
        console.error("Failed to load vaults:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchVaults();
  }, []);

  const toggleVault = (vaultId: string) => {
    if (value.includes(vaultId)) {
      onValueChange(value.filter((id) => id !== vaultId));
    } else {
      onValueChange([...value, vaultId]);
    }
  };

  const selectedVaultNames = vaults.filter((v) => value.includes(v.id)).map((v) => v.name);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 justify-between gap-2", className)}
        >
          <Database className="h-4 w-4 shrink-0 opacity-70" />
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : value.length === 0 ? (
            <span className="text-muted-foreground">Select vaults...</span>
          ) : value.length === 1 ? (
            <span className="max-w-[120px] truncate">{selectedVaultNames[0]}</span>
          ) : (
            <span>{value.length} vaults</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search vaults..." />
          <CommandList>
            <CommandEmpty>No vaults found.</CommandEmpty>
            <CommandGroup>
              {vaults.map((vault) => (
                <CommandItem key={vault.id} value={vault.name} onSelect={() => toggleVault(vault.id)}>
                  <Check className={cn("mr-2 h-4 w-4", value.includes(vault.id) ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{vault.name}</p>
                    {vault.description && <p className="text-muted-foreground truncate text-xs">{vault.description}</p>}
                  </div>
                  {vault.objectCount !== undefined && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {vault.objectCount} files
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {value.length > 0 && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => onValueChange([])}>
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
