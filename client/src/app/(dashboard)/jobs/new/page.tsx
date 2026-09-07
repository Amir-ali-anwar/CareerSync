"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { JobForm } from "@/components/jobs/job-form";
import { RoleGuard } from "@/components/common/role-guard";
import { MobilePageHeader, usePageHeader } from "@/providers/page-header-provider";
import { useCreateJob } from "@/hooks/use-jobs";
import { ApiError } from "@/types/api";
import type { CreateJobPayload } from "@/types/job";

function NewJobForm() {
  const router = useRouter();
  const createJob = useCreateJob();
  usePageHeader("Post a job", "AI will analyze the description to power skill and experience matching for applicants.");

  async function handleSubmit(payload: CreateJobPayload) {
    try {
      const job = await createJob.mutateAsync(payload);
      toast.success("Job posted. AI is analyzing the description in the background.");
      router.push(`/jobs/${job._id}`);
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <MobilePageHeader />
      <JobForm onSubmit={handleSubmit} isSubmitting={createJob.isPending} submitLabel="Post job" />
    </div>
  );
}

export default function NewJobPage() {
  return (
    <RoleGuard role="employer">
      <NewJobForm />
    </RoleGuard>
  );
}
