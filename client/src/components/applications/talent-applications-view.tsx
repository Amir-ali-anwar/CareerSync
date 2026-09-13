"use client";

import Link from "next/link";
import { ClipboardList, Download } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
import { MetricItem, MetricStrip } from "@/components/dashboard/stat-card";
import { useDownloadCv, useMyApplications, useWithdrawApplication } from "@/hooks/use-applications";
import { useSeedJobCache } from "@/hooks/use-jobs";
import { MobilePageHeader, usePageHeader } from "@/providers/page-header-provider";
import { formatDate } from "@/lib/utils";
import { WITHDRAWABLE_STATUSES } from "@/types/application";
import { ApiError } from "@/types/api";
import type { Job } from "@/types/job";
import { toast } from "sonner";

export function TalentApplicationsView() {
  usePageHeader("Applications", "Track the status of every job you've applied to.");
  const applicationsQuery = useMyApplications();
  const withdraw = useWithdrawApplication();
  const downloadCv = useDownloadCv();

  const populatedJobs = (applicationsQuery.data?.applications || [])
    .map((app) => app.job)
    .filter((job): job is Job => typeof job !== "string");
  useSeedJobCache(populatedJobs);

  async function handleWithdraw(id: string) {
    try {
      await withdraw.mutateAsync(id);
      toast.success("Application withdrawn");
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  return (
    <div className="space-y-6">
      <MobilePageHeader />

      {applicationsQuery.data && (
        <MetricStrip>
          <MetricItem
            label="Total Submitted"
            value={applicationsQuery.data.TotalSubmittedApplications}
            icon={ClipboardList}
          />
          <MetricItem label="Active" value={applicationsQuery.data.ActiveApplications} icon={ClipboardList} accent="success" />
        </MetricStrip>
      )}

      {applicationsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : applicationsQuery.isError ? (
        <ErrorState error={applicationsQuery.error} onRetry={() => applicationsQuery.refetch()} />
      ) : (applicationsQuery.data?.applications.length || 0) === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No applications yet"
          description="Browse open jobs and apply to start tracking them here."
          action={
            <Button size="sm" render={<Link href="/jobs" />}>
              Browse jobs
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applicationsQuery.data?.applications.map((application) => {
                const job = typeof application.job === "string" ? null : (application.job as Job);
                const canWithdraw = WITHDRAWABLE_STATUSES.includes(application.status);
                return (
                  <TableRow key={application._id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium">{job?.company || "—"}</TableCell>
                    <TableCell>
                      {job ? (
                        <Link href={`/jobs/${job._id}`} className="hover:underline">
                          {job.title || application.Jobtitle}
                        </Link>
                      ) : (
                        application.Jobtitle
                      )}
                    </TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={application.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(application.appliedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => downloadCv.mutate(application._id)}
                          aria-label="Download your CV"
                        >
                          <Download className="size-4" />
                        </Button>
                        {canWithdraw && (
                          <AlertDialog>
                            <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
                              Withdraw
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Withdraw this application?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  You can&apos;t re-apply once a decision has been made on this job.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleWithdraw(application._id)}>
                                  Withdraw
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
