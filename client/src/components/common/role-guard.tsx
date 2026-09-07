"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Loading } from "@/components/common/loading";
import type { UserRole } from "@/types/user";

export function RoleGuard({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== role) router.replace("/dashboard");
  }, [user, role, router]);

  if (!user || user.role !== role) return <Loading />;
  return <>{children}</>;
}
