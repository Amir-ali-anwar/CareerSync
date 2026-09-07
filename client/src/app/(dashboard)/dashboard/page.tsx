"use client";

import { useAuth } from "@/providers/auth-provider";
import { TalentDashboard } from "@/components/dashboard/talent-dashboard";
import { EmployerDashboard } from "@/components/dashboard/employer-dashboard";

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === "employer") return <EmployerDashboard />;
  return <TalentDashboard />;
}
