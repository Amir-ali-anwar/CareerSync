"use client";

import { useAuth } from "@/providers/auth-provider";
import { TalentApplicationsView } from "@/components/applications/talent-applications-view";
import { EmployerApplicationsView } from "@/components/applications/employer-applications-view";

export default function ApplicationsPage() {
  const { user } = useAuth();

  if (user?.role === "employer") return <EmployerApplicationsView />;
  return <TalentApplicationsView />;
}
