"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Briefcase, Building2, ClipboardList, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MetricItem, MetricStrip } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
import { useAuth } from "@/providers/auth-provider";
import { usePageHeader } from "@/providers/page-header-provider";
import { useEmployerJobs } from "@/hooks/use-jobs";
import { useTalents } from "@/hooks/use-talents";
import { useMyOrganizations } from "@/hooks/use-organizations";
import { formatRelativeDate, initials } from "@/lib/utils";
import { APPLICATION_STATUSES } from "@/constants";
import type { ApplicationTalent } from "@/types/application";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function EmployerDashboard() {
  const { user } = useAuth();
  usePageHeader(`${greeting()}, ${user?.name ?? ""}`, "Here's how your hiring pipeline is doing.");
  const jobsQuery = useEmployerJobs({ limit: 50, sort: "newest" });
  const talentsQuery = useTalents(1, 50);
  const orgsQuery = useMyOrganizations();

  const jobs = jobsQuery.data?.jobs || [];
  const openJobsCount = jobs.filter((job) => !job.isClosed).length;
  const applications = talentsQuery.data?.applications || [];

  const statusChartData = APPLICATION_STATUSES.map((s) => ({
    status: s.label,
    count: applications.filter((app) => app.status === s.value).length,
  })).filter((d) => d.count > 0);

  return (
    <div className="space-y-6">
      {jobsQuery.isError || talentsQuery.isError ? (
        <ErrorState onRetry={() => { jobsQuery.refetch(); talentsQuery.refetch(); }} />
      ) : (
        <MetricStrip>
          <MetricItem label="Total Jobs" value={jobsQuery.data?.totalJobs ?? (jobsQuery.isLoading ? "…" : 0)} icon={Briefcase} />
          <MetricItem label="Open Jobs" value={jobsQuery.isLoading ? "…" : openJobsCount} icon={Briefcase} accent="success" />
          <MetricItem
            label="Total Applicants"
            value={talentsQuery.data?.totalApplications ?? (talentsQuery.isLoading ? "…" : 0)}
            icon={Users}
            accent="violet"
          />
          <MetricItem
            label="Organizations"
            value={orgsQuery.data?.OrganizationCount ?? (orgsQuery.isLoading ? "…" : 0)}
            icon={Building2}
            accent="warning"
          />
        </MetricStrip>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Applicants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {talentsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No applicants yet"
                description="Once candidates apply to your job postings, they'll show up here."
                action={
                  <Button size="sm" render={<Link href="/jobs" />}>
                    Manage jobs
                  </Button>
                }
              />
            ) : (
              applications.slice(0, 5).map((application) => {
                const talent = typeof application.talent === "string" ? null : (application.talent as ApplicationTalent);
                return (
                  <div
                    key={application._id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className="bg-primary-light text-xs font-medium text-primary">
                          {talent?.name ? initials(talent.name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{talent?.name || "Applicant"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {application.Jobtitle} · {formatRelativeDate(application.appliedAt)}
                        </p>
                      </div>
                    </div>
                    <ApplicationStatusBadge status={application.status} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Applications by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No applications to chart yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusChartData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <YAxis
                    type="category"
                    dataKey="status"
                    width={90}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {!jobsQuery.isLoading && jobs.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="Post your first job"
          description="Create a job posting to start receiving AI-matched applicants."
          action={
            <Button size="sm" render={<Link href="/jobs" />}>
              Post a job
            </Button>
          }
        />
      )}
    </div>
  );
}
