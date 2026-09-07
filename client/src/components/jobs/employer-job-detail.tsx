"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Lock, Trash2, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Loading } from "@/components/common/loading";
import { MatchScoreRing } from "@/components/common/match-score-ring";
import { JobForm } from "@/components/jobs/job-form";
import { useCloseJob, useDeleteJob, useJob, useUpdateJob } from "@/hooks/use-jobs";
import { useDownloadCv, useJobApplications, useUpdateApplicationStatus } from "@/hooks/use-applications";
import { MobilePageHeader, usePageHeader } from "@/providers/page-header-provider";
import { initials, titleCase } from "@/lib/utils";
import { MUTABLE_APPLICATION_STATUSES, type ApplicationStatus } from "@/types/application";
import { ApiError } from "@/types/api";
import type { CreateJobPayload } from "@/types/job";
import type { ApplicationTalent } from "@/types/application";

export function EmployerJobDetail({ jobId }: { jobId: string }) {
  const router = useRouter();
  const jobQuery = useJob(jobId);
  const updateJob = useUpdateJob(jobId);
  const closeJob = useCloseJob(jobId);
  const deleteJob = useDeleteJob();
  const applicationsQuery = useJobApplications(jobId);
  const updateStatus = useUpdateApplicationStatus();
  const downloadCv = useDownloadCv();
  usePageHeader(jobQuery.data ? jobQuery.data.title || jobQuery.data.position : "Job", jobQuery.data?.company);

  if (jobQuery.isLoading) return <Loading label="Loading job…" />;
  if (jobQuery.isError || !jobQuery.data) {
    return <ErrorState error={jobQuery.error} onRetry={() => jobQuery.refetch()} />;
  }

  const job = jobQuery.data;

  async function handleUpdate(payload: CreateJobPayload) {
    try {
      await updateJob.mutateAsync(payload);
      toast.success("Job updated");
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  async function handleClose() {
    try {
      await closeJob.mutateAsync();
      toast.success("Job closed for applications");
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  async function handleDelete() {
    try {
      await deleteJob.mutateAsync(jobId);
      toast.success("Job deleted");
      router.push("/jobs");
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <MobilePageHeader />
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {job.jobStatus}
            </Badge>
            {job.isClosed && <Badge variant="secondary">Closed</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {!job.isClosed && (
            <Button variant="outline" size="sm" onClick={handleClose} disabled={closeJob.isPending}>
              <Lock className="size-4" /> Close applications
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
              <Trash2 className="size-4" /> Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this job?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the job and all of its applications. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleteJob.isPending}>
                  Delete job
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit job details</CardTitle>
        </CardHeader>
        <CardContent>
          <JobForm initialJob={job} onSubmit={handleUpdate} isSubmitting={updateJob.isPending} submitLabel="Save changes" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Applicants {applicationsQuery.data ? `(${applicationsQuery.data.length})` : ""}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {applicationsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : applicationsQuery.isError ? (
            <ErrorState error={applicationsQuery.error} onRetry={() => applicationsQuery.refetch()} />
          ) : (applicationsQuery.data?.length || 0) === 0 ? (
            <EmptyState icon={Users} title="No applicants yet" description="Applicants will appear here once candidates apply." />
          ) : (
            applicationsQuery.data?.map((application) => {
              const talent = typeof application.talent === "string" ? null : (application.talent as ApplicationTalent);
              return (
                <div
                  key={application._id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {application.match ? (
                      <MatchScoreRing score={application.match.matchScore} size={44} strokeWidth={4} />
                    ) : (
                      <div className="size-11 shrink-0 rounded-full bg-secondary" />
                    )}
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback className="bg-primary-light text-xs font-medium text-primary">
                        {talent?.name ? initials(talent.name) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{talent?.name || "Applicant"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {talent?.email} · {titleCase(application.experienceLevel)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => downloadCv.mutate(application._id)}
                      disabled={downloadCv.isPending}
                      aria-label="Download CV"
                    >
                      <Download className="size-4" />
                    </Button>
                    <Select
                      value={application.status}
                      disabled={application.status === "withdrawn"}
                      onValueChange={(status) =>
                        updateStatus.mutate(
                          { jobId, applicantId: talent?._id || "", status: status as ApplicationStatus },
                          {
                            onError: (error) => {
                              if (error instanceof ApiError) toast.error(error.message);
                            },
                          }
                        )
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {application.status === "withdrawn" && (
                          <SelectItem value="withdrawn">Withdrawn</SelectItem>
                        )}
                        {MUTABLE_APPLICATION_STATUSES.map((status) => (
                          <SelectItem key={status} value={status} className="capitalize">
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
