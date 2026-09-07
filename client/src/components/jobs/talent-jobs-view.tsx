"use client";

import { useState } from "react";
import { Briefcase, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard } from "@/components/jobs/job-card";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { SimplePagination } from "@/components/common/simple-pagination";
import { useSearchJobs, useSeedJobCache, useSemanticSearchJobs } from "@/hooks/use-jobs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MobilePageHeader, usePageHeader } from "@/providers/page-header-provider";
import { JOB_TYPES, WORK_MODES } from "@/constants";
import type { Job, JobType, WorkMode } from "@/types/job";

function ResultsGrid({
  isLoading,
  isError,
  error,
  jobs,
  onRetry,
  emptyTitle,
  emptyDescription,
}: {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  jobs: Job[];
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState error={error} onRetry={onRetry} />;
  if (jobs.length === 0) {
    return <EmptyState icon={Briefcase} title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {jobs.map((job) => (
        <JobCard key={job._id} job={job} />
      ))}
    </div>
  );
}

function BrowseTab() {
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState<JobType | "all">("all");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const debouncedCountry = useDebouncedValue(country);

  const query = useSearchJobs({
    search: debouncedSearch || undefined,
    jobType,
    country: debouncedCountry || undefined,
    sort: "newest",
    page,
    limit: 9,
  });
  useSeedJobCache(query.data?.jobs);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, company, or keyword"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Input
          placeholder="Country"
          className="sm:w-40"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={jobType}
          onValueChange={(value) => {
            setJobType(value as JobType | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Job type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All job types</SelectItem>
            {JOB_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ResultsGrid
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        jobs={query.data?.jobs || []}
        onRetry={() => query.refetch()}
        emptyTitle="No jobs found"
        emptyDescription="Try a broader search or clear your filters."
      />

      {query.data && (
        <SimplePagination page={query.data.currentPage} numOfPages={query.data.numOfPages} onPageChange={setPage} />
      )}
    </div>
  );
}

function SemanticTab() {
  const [q, setQ] = useState("");
  const [workMode, setWorkMode] = useState<WorkMode | "all">("all");
  const debouncedQ = useDebouncedValue(q, 500);

  const query = useSemanticSearchJobs(
    debouncedQ.trim().length >= 2 ? { q: debouncedQ, workMode, limit: 9 } : null
  );
  useSeedJobCache(query.data?.jobs);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Sparkles className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-accent-violet" />
          <Input
            placeholder='Try "senior React jobs with AI experience" or "remote AI engineer roles"'
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={workMode} onValueChange={(value) => setWorkMode(value as WorkMode | "all")}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Work mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All work modes</SelectItem>
            {WORK_MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {debouncedQ.trim().length < 2 ? (
        <EmptyState
          icon={Sparkles}
          title="Search naturally"
          description='Describe the role you want in plain language, e.g. "frontend roles requiring TypeScript and Next.js".'
        />
      ) : (
        <ResultsGrid
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          jobs={query.data?.jobs || []}
          onRetry={() => query.refetch()}
          emptyTitle="No matching jobs"
          emptyDescription="Try rephrasing your search or removing filters."
        />
      )}
    </div>
  );
}

export function TalentJobsView() {
  usePageHeader("Jobs", "Browse open roles or search naturally with AI.");
  return (
    <div className="space-y-6">
      <MobilePageHeader />
      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="semantic">
            <Sparkles className="size-3.5" /> Semantic Search
          </TabsTrigger>
        </TabsList>
        <TabsContent value="browse">
          <BrowseTab />
        </TabsContent>
        <TabsContent value="semantic">
          <SemanticTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
