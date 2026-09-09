"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, ClipboardList, Search, Sparkles } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricItem, MetricStrip } from "@/components/dashboard/stat-card";
import { HeroBanner } from "@/components/dashboard/hero-banner";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ApplicationStatusBadge } from "@/components/common/status-badge";
import { MatchScoreRing } from "@/components/common/match-score-ring";
import { useAuth } from "@/providers/auth-provider";
import { usePageHeader } from "@/providers/page-header-provider";
import { useMyApplications } from "@/hooks/use-applications";
import { useSearchJobs, useSeedJobCache } from "@/hooks/use-jobs";
import { useJobMatches } from "@/hooks/use-matches";
import { formatRelativeDate } from "@/lib/utils";
import type { Job } from "@/types/job";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function TalentDashboard() {
  const { user } = useAuth();
  usePageHeader(`${greeting()}, ${user?.name ?? ""}`, "Here's what's happening with your career today.");
  const applicationsQuery = useMyApplications();
  const jobsQuery = useSearchJobs({ limit: 1 });

  const recentApplications = [...(applicationsQuery.data?.applications || [])]
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
    .slice(0, 5);

  const recentJobIds = recentApplications
    .slice(0, 3)
    .map((app) => (typeof app.job === "string" ? app.job : app.job._id));
  const matchQueries = useJobMatches(recentJobIds);

  const populatedJobs = (applicationsQuery.data?.applications || [])
    .map((app) => app.job)
    .filter((job): job is Job => typeof job !== "string");
  useSeedJobCache(populatedJobs);

  const resolvedScores = matchQueries.map((q) => q.data?.matchScore).filter((s): s is number => s !== undefined);
  const averageScore =
    resolvedScores.length > 0 ? Math.round(resolvedScores.reduce((a, b) => a + b, 0) / resolvedScores.length) : null;

  return (
    <div className="space-y-6">
      {averageScore !== null ? (
        <HeroBanner
          eyebrow="AI Career Insight"
          icon={Sparkles}
          title="Your applications are matching well"
          description="Here's how your recent applications are scoring against role requirements."
          stat={{ label: "Avg. match score", value: `${averageScore}%` }}
          action={
            <Button
              size="sm"
              className="shrink-0 border-transparent bg-white text-primary hover:bg-white/90"
              render={<Link href="/matches" />}
            >
              Explore Matches
            </Button>
          }
        />
      ) : (
        <HeroBanner
          eyebrow="Career Insight"
          icon={Search}
          title="Find your next opportunity"
          description="Browse open roles curated to your profile and get an instant AI match score."
          action={
            <Button
              size="sm"
              className="shrink-0 border-transparent bg-white text-primary hover:bg-white/90"
              render={<Link href="/jobs" />}
            >
              Browse Jobs
            </Button>
          }
        />
      )}

      {applicationsQuery.isError ? (
        <ErrorState error={applicationsQuery.error} onRetry={() => applicationsQuery.refetch()} />
      ) : (
        <MetricStrip>
          <MetricItem
            label="Total Applications"
            value={applicationsQuery.data?.TotalSubmittedApplications ?? (applicationsQuery.isLoading ? "…" : 0)}
            icon={ClipboardList}
          />
          <MetricItem
            label="Active Applications"
            value={applicationsQuery.data?.ActiveApplications ?? (applicationsQuery.isLoading ? "…" : 0)}
            icon={Sparkles}
            accent="violet"
          />
          <MetricItem
            label="Open Jobs Available"
            value={jobsQuery.data?.totalJobs ?? (jobsQuery.isLoading ? "…" : 0)}
            icon={Briefcase}
            accent="success"
          />
        </MetricStrip>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="rounded-2xl shadow-sm transition-shadow hover:shadow-md lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            {recentApplications.length > 0 && (
              <CardAction>
                <Link
                  href="/applications"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {applicationsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentApplications.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No applications yet"
                description="Browse open roles and apply to start tracking your applications here."
                action={
                  <Button size="sm" render={<Link href="/jobs" />}>
                    Browse jobs
                  </Button>
                }
              />
            ) : (
              recentApplications.map((application) => {
                const job = typeof application.job === "string" ? null : (application.job as Job);
                const jobId = typeof application.job === "string" ? application.job : application.job._id;
                return (
                  <Link
                    key={application._id}
                    href={`/jobs/${jobId}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-all hover:border-primary/30 hover:bg-muted/40 hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {job?.title || application.Jobtitle || "Job"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {job?.company} · Applied {formatRelativeDate(application.appliedAt)}
                      </p>
                    </div>
                    <ApplicationStatusBadge status={application.status} />
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm transition-shadow hover:shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Match Scores</CardTitle>
            {recentJobIds.length > 0 && (
              <CardAction>
                <Link
                  href="/matches"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {recentJobIds.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Apply to a job to see AI match scores here.
              </p>
            ) : (
              recentJobIds.map((jobId, index) => {
                const matchQuery = matchQueries[index];
                const application = recentApplications[index];
                const job = typeof application.job === "string" ? null : (application.job as Job);
                return (
                  <Link
                    key={jobId}
                    href={`/jobs/${jobId}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-all hover:border-primary/30 hover:bg-muted/40 hover:shadow-sm"
                  >
                    {matchQuery?.isLoading ? (
                      <Skeleton className="size-12 shrink-0 rounded-full" />
                    ) : matchQuery?.data ? (
                      <MatchScoreRing score={matchQuery.data.matchScore} size={48} strokeWidth={4} />
                    ) : (
                      <div className="size-12 shrink-0 rounded-full bg-secondary" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{job?.title || "View job"}</p>
                      <p className="truncate text-xs text-muted-foreground">{job?.company}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
