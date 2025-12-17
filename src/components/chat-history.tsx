"use client";

import { useState, useEffect } from "react";

import { History, Loader2, MessageSquare, Trash2, ChevronDown } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  title: string;
  caseId?: string;
  caseName?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatHistoryProps {
  currentChatId?: string;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  className?: string;
}

export function ChatHistory({ currentChatId, onSelectChat, onNewChat, className }: ChatHistoryProps) {
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteChat, setDeleteChat] = useState<Chat | null>(null);

  const fetchChats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/chats");
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (err) {
      console.error("Failed to load chats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchChats();
    }
  }, [open]);

  const handleDelete = async (chat: Chat) => {
    try {
      const response = await fetch(`/api/chats?id=${chat.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chat.id));
        if (currentChatId === chat.id) {
          onNewChat();
        }
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    } finally {
      setDeleteChat(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const currentChat = chats.find((c) => c.id === currentChatId);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn("h-9 justify-between gap-2", className)}>
            <History className="h-4 w-4 shrink-0 opacity-70" />
            <span className="max-w-[150px] truncate">{currentChat?.title || "Chat History"}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[300px]" align="start">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Recent Chats</span>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="h-[300px]">
            {chats.length === 0 && !isLoading ? (
              <div className="text-muted-foreground p-4 text-center text-sm">No previous chats</div>
            ) : (
              chats.map((chat) => (
                <DropdownMenuItem
                  key={chat.id}
                  className={cn(
                    "group flex cursor-pointer items-start gap-2 py-2",
                    currentChatId === chat.id && "bg-accent",
                  )}
                  onSelect={(e) => {
                    e.preventDefault();
                    onSelectChat(chat.id);
                    setOpen(false);
                  }}
                >
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{chat.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatDate(chat.updatedAt)}
                      {chat.caseName && ` · ${chat.caseName}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteChat(chat);
                    }}
                  >
                    <Trash2 className="text-destructive h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!deleteChat} onOpenChange={() => setDeleteChat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteChat?.title}&rdquo; and all its messages. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteChat && handleDelete(deleteChat)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
