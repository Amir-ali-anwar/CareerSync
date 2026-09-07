"use client";

import { use } from "react";
import { useAuth } from "@/providers/auth-provider";
import { TalentJobDetail } from "@/components/jobs/talent-job-detail";
import { EmployerJobDetail } from "@/components/jobs/employer-job-detail";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();

  if (user?.role === "employer") return <EmployerJobDetail jobId={id} />;
  return <TalentJobDetail jobId={id} />;
}
