"use client";

import Link from "next/link";
import { ArrowLeft, Briefcase, Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { SkillBadgeList } from "@/components/common/skill-badge-list";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
import { JobMatchPanel } from "@/components/jobs/job-match-panel";
import { ApplyJobDialog } from "@/components/jobs/apply-job-dialog";
import { useTalentJobDetail } from "@/hooks/use-jobs";
import { useMyApplications } from "@/hooks/use-applications";
import { MobilePageHeader, usePageHeader } from "@/providers/page-header-provider";
import { formatDate, formatSalary, titleCase } from "@/lib/utils";

export function TalentJobDetail({ jobId }: { jobId: string }) {
  const { data: job } = useTalentJobDetail(jobId);
  const applicationsQuery = useMyApplications();
  usePageHeader(job ? job.title || job.position : "Job", job?.company);

  const existingApplication = applicationsQuery.data?.applications.find(
    (app) => (typeof app.job === "string" ? app.job : app.job._id) === jobId
  );

  if (!job) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Open this job from search"
        description="Job details are only available when opened from the Jobs search page in this session."
        action={
          <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="size-4" /> Back to jobs
          </Link>
        }
      />
    );
  }

  const salary = formatSalary(job.salaryRange?.min, job.salaryRange?.max, job.salaryRange?.currency);
  const deadlinePassed = job.applicationDeadline ? new Date(job.applicationDeadline).getTime() < Date.now() : false;
  const canApply = !existingApplication && !job.isClosed && !deadlinePassed;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to jobs
      </Link>

      <MobilePageHeader />

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-4" />
              {job.jobLocation.city}, {job.jobLocation.country}
              {job.workMode ? ` · ${titleCase(job.workMode)}` : ""}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="size-4" />
              {titleCase(job.jobType)}
            </span>
            {job.applicationDeadline && (
              <span className="flex items-center gap-1">
                <Calendar className="size-4" />
                Apply by {formatDate(job.applicationDeadline)}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {existingApplication ? (
            <div className="space-y-1.5 text-right">
              <p className="text-xs text-muted-foreground">You applied</p>
              <ApplicationStatusBadge status={existingApplication.status} />
            </div>
          ) : job.isClosed ? (
            <Badge variant="secondary">Applications closed</Badge>
          ) : deadlinePassed ? (
            <Badge variant="secondary">Deadline passed</Badge>
          ) : (
            <ApplyJobDialog jobId={job._id} jobTitle={job.title || job.position} />
          )}
        </div>
      </div>

      {salary && <Badge variant="outline">{salary}</Badge>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{job.description}</p>
            </CardContent>
          </Card>

          {(job.requiredSkills.length > 0 || job.preferredSkills.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.requiredSkills.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Required</p>
                    <SkillBadgeList skills={job.requiredSkills} />
                  </div>
                )}
                {job.preferredSkills.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Preferred</p>
                    <SkillBadgeList skills={job.preferredSkills} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <JobMatchPanel jobId={jobId} />
          {canApply && (
            <div className="lg:hidden">
              <ApplyJobDialog jobId={job._id} jobTitle={job.title || job.position} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
