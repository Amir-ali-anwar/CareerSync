"use client";

import { useAuth } from "@/providers/auth-provider";
import { TalentJobsView } from "@/components/jobs/talent-jobs-view";
import { EmployerJobsView } from "@/components/jobs/employer-jobs-view";

export default function JobsPage() {
  const { user } = useAuth();

  if (user?.role === "employer") return <EmployerJobsView />;
  return <TalentJobsView />;
}
