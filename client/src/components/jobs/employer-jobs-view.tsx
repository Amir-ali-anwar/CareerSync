"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { SimplePagination } from "@/components/common/simple-pagination";
import { useEmployerJobs } from "@/hooks/use-jobs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MobilePageHeader, usePageHeader } from "@/providers/page-header-provider";
import { formatDate, titleCase } from "@/lib/utils";
import { JOB_TYPES } from "@/constants";
import type { JobStatus, JobType } from "@/types/job";

export function EmployerJobsView() {
  usePageHeader("Jobs", "Manage your job postings and review applicants.");
  const [search, setSearch] = useState("");
  const [jobStatus, setJobStatus] = useState<JobStatus | "all">("all");
  const [jobType, setJobType] = useState<JobType | "all">("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const query = useEmployerJobs({
    search: debouncedSearch || undefined,
    jobStatus,
    jobType,
    sort: "newest",
    page,
    limit: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <MobilePageHeader />
        <Button render={<Link href="/jobs/new" />} className="ml-auto">
          <Plus className="size-4" /> Post a job
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or company"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={jobStatus} onValueChange={(v) => { setJobStatus(v as JobStatus | "all"); setPage(1); }}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="interview">Interview</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
        <Select value={jobType} onValueChange={(v) => { setJobType(v as JobType | "all"); setPage(1); }}>
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

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (query.data?.jobs.length || 0) === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description="Post your first job to start receiving AI-matched applicants."
          action={
            <Button size="sm" render={<Link href="/jobs/new" />}>
              Post a job
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Posted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data?.jobs.map((job) => (
                <TableRow key={job._id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/jobs/${job._id}`} className="hover:underline">
                      {job.title || job.position}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{job.company}</TableCell>
                  <TableCell className="text-muted-foreground">{titleCase(job.jobType)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="capitalize">
                        {job.jobStatus}
                      </Badge>
                      {job.isClosed && <Badge variant="secondary">Closed</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(job.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {query.data && (
        <SimplePagination page={query.data.currentPage} numOfPages={query.data.numOfPages} onPageChange={setPage} />
      )}
    </div>
  );
}
