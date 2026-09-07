import type { LucideIcon } from "lucide-react";
import { Briefcase, Building2, LayoutDashboard, Settings, Sparkles, UserCircle, Users } from "lucide-react";
import type { UserRole } from "@/types/user";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const TALENT_NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Profile", href: "/profile", icon: UserCircle },
    ],
  },
  {
    label: "Opportunities",
    items: [
      { label: "Jobs", href: "/jobs", icon: Briefcase },
      { label: "Matches", href: "/matches", icon: Sparkles },
      { label: "Applications", href: "/applications", icon: Users },
    ],
  },
];

export const EMPLOYER_NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Opportunities",
    items: [
      { label: "Jobs", href: "/jobs", icon: Briefcase },
      { label: "Applications", href: "/applications", icon: Users },
      { label: "Organization", href: "/organization", icon: Building2 },
    ],
  },
];

export const SETTINGS_NAV_ITEM: NavItem = { label: "Settings", href: "/settings", icon: Settings };

export function navGroupsForRole(role: UserRole | undefined): NavGroup[] {
  return role === "employer" ? EMPLOYER_NAV_GROUPS : TALENT_NAV_GROUPS;
}

export function navItemsForRole(role: UserRole | undefined): NavItem[] {
  return navGroupsForRole(role).flatMap((group) => group.items);
}
