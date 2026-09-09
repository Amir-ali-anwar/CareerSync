"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/common/logo";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { NotificationBell } from "@/components/common/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { useLogout } from "@/hooks/use-auth";
import { usePageHeaderContext } from "@/providers/page-header-provider";
import { initials } from "@/lib/utils";
import { toast } from "sonner";

export function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const logout = useLogout();
  const { header } = usePageHeaderContext();

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } finally {
      toast.success("Signed out");
      router.replace("/login");
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6 lg:px-10">
      <div className="flex min-w-0 items-center gap-2 md:hidden">
        <Logo size={24} />
      </div>

      <div className="hidden min-w-0 md:block">
        {header && (
          <div>
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{header.title}</h1>
            {header.description && (
              <p className="truncate text-xs text-muted-foreground">{header.description}</p>
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg py-1 pr-1 pl-1 transition-colors hover:bg-secondary md:pr-2"
                aria-label="Account menu"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary-light text-xs font-medium text-primary">
                    {user?.name ? initials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-28 truncate text-sm font-medium text-foreground md:inline">
                  {user?.name}
                </span>
                <ChevronDown className="hidden size-3.5 text-muted-foreground md:inline" />
              </button>
            }
          />
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{user?.role}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings className="size-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="size-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
