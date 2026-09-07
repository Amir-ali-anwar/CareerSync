"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useLogout } from "@/hooks/use-auth";
import { useUiStore } from "@/store/ui-store";
import { navGroupsForRole, SETTINGS_NAV_ITEM } from "@/constants/navigation";
import { cn, initials } from "@/lib/utils";
import { toast } from "sonner";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const logout = useLogout();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  const navGroups = navGroupsForRole(user?.role);

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } catch {
      // logout clears client cache regardless via onSettled - proceed to redirect either way
    } finally {
      toast.success("Signed out");
      router.replace("/login");
    }
  }

  function navLinkClasses(isActive: boolean) {
    return cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-primary-light text-primary"
        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
      sidebarCollapsed && "justify-center px-0"
    );
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 md:flex",
        sidebarCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!sidebarCollapsed && (
          <Link href="/dashboard">
            <Logo size={26} />
          </Link>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            {!sidebarCollapsed && (
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLinkClasses(isActive)}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon className="size-4.5 shrink-0" />
                  {!sidebarCollapsed && item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!sidebarCollapsed && (
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
            Account
          </p>
        )}
        <Link href={SETTINGS_NAV_ITEM.href} className={cn(navLinkClasses(pathname.startsWith(SETTINGS_NAV_ITEM.href)), "mb-2")}>
          <SETTINGS_NAV_ITEM.icon className="size-4.5 shrink-0" />
          {!sidebarCollapsed && SETTINGS_NAV_ITEM.label}
        </Link>

        <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2", sidebarCollapsed && "justify-center px-0")}>
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="bg-primary-light text-xs font-medium text-primary">
              {user?.name ? initials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.name}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">{user?.role}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleLogout}
            disabled={logout.isPending}
            aria-label="Log out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
