"use client";

import { LogOut, Shield, User as UserIcon } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  const user = {
    name: session.user.name || "User",
    email: session.user.email || "",
    role: (session.user as any).role || "user",
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/v1/login" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-9 cursor-pointer rounded-lg transition-opacity hover:opacity-80">
          <AvatarFallback className="bg-primary text-primary-foreground rounded-lg">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm leading-none font-medium">{user.name}</p>
            <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="cursor-default">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              {user.role === "admin" ? <Shield className="text-primary size-4" /> : <UserIcon className="size-4" />}
              <span className="text-sm">Role</span>
            </div>
            <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs capitalize">
              {user.role}
            </Badge>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
