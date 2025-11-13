"use client";
import * as React from "react";
import { useRouter } from "next/navigation";

import {
  Search,
  Plus,
  FolderLock,
  ScanText,
  Mic,
  MessageSquare,
  Briefcase,
  Users,
  LayoutDashboard,
  FileText,
  Volume2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const commands = [
  // Quick Create
  { group: "Quick Create", icon: Plus, label: "New Case", action: "create-case" },
  { group: "Quick Create", icon: Plus, label: "New Vault", action: "create-vault" },
  { group: "Quick Create", icon: Plus, label: "New User", action: "add-user" },
  { group: "Quick Create", icon: Plus, label: "New Group", action: "create-group" },

  // Navigate
  { group: "Navigate", icon: LayoutDashboard, label: "Dashboard", action: "/dashboard/default" },
  { group: "Navigate", icon: Briefcase, label: "Case Management", action: "/dashboard/cases" },
  { group: "Navigate", icon: FolderLock, label: "Vaults", action: "/dashboard/vaults" },
  { group: "Navigate", icon: MessageSquare, label: "AI Chat", action: "/dashboard/chat" },
  { group: "Navigate", icon: ScanText, label: "OCR", action: "/dashboard/ocr" },
  { group: "Navigate", icon: Mic, label: "Transcription", action: "/dashboard/transcription" },
  { group: "Navigate", icon: Volume2, label: "Text-to-Speech", action: "/dashboard/speak" },

  // Settings
  { group: "Settings", icon: Users, label: "Team Members", action: "/dashboard/team" },
  { group: "Settings", icon: Users, label: "Groups", action: "/dashboard/groups" },
  { group: "Settings", icon: FileText, label: "Permissions", action: "/dashboard/permissions" },
];

export function SearchDialog({ onOpenChange }: { onOpenChange?: (open: boolean) => void } = {}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Expose method to open dialog programmatically
  React.useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("open-command-palette", handleOpen);
    return () => window.removeEventListener("open-command-palette", handleOpen);
  }, []);

  const handleSelect = (action: string) => {
    handleOpenChange(false);

    // Quick create actions - dispatch events that dialogs listen for
    if (action === "create-case") {
      window.dispatchEvent(new CustomEvent("command-create-case"));
    } else if (action === "create-vault") {
      window.dispatchEvent(new CustomEvent("command-create-vault"));
    } else if (action === "add-user") {
      window.dispatchEvent(new CustomEvent("command-add-user"));
    } else if (action === "create-group") {
      window.dispatchEvent(new CustomEvent("command-create-group"));
    } else if (action.startsWith("/")) {
      // Navigation
      router.push(action);
    }
  };

  return (
    <>
      <Button
        variant="link"
        className="text-muted-foreground !px-0 font-normal hover:no-underline"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        Search
        <kbd className="bg-muted inline-flex h-5 items-center gap-1 rounded border px-1.5 text-[10px] font-medium select-none">
          <span className="text-xs">⌘</span>J
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {[...new Set(commands.map((item) => item.group))].map((group, i) => (
            <React.Fragment key={group}>
              {i !== 0 && <CommandSeparator />}
              <CommandGroup heading={group} key={group}>
                {commands
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <CommandItem className="!py-2" key={item.label} onSelect={() => handleSelect(item.action)}>
                      {item.icon && <item.icon className="mr-2 size-4" />}
                      <span>{item.label}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
