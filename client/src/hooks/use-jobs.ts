"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { jobsApi } from "@/lib/api/jobs";
import { QUERY_KEYS } from "@/constants";
import type {
  CreateJobPayload,
  EmployerJobsQuery,
  Job,
  SemanticJobSearchQuery,
  TalentJobSearchQuery,
  UpdateJobPayload,
} from "@/types/job";

export function useEmployerJobs(query: EmployerJobsQuery) {
  return useQuery({
    queryKey: QUERY_KEYS.employerJobs(query),
    queryFn: () => jobsApi.getEmployerJobs(query),
    placeholderData: (previous) => previous,
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.job(id || ""),
    queryFn: () => jobsApi.getJob(id as string),
    enabled: Boolean(id),
  });
}

/**
 * GET /jobs/:id is employer-only - talents have no direct fetch-by-id endpoint (see
 * MISSING_BACKEND_FEATURES.md). Talent job detail pages instead read whatever full Job
 * object was already seeded into this same query key from a search/semantic-search
 * result list (see useSeedJobCache below). If nothing was seeded (e.g. a direct link or
 * refresh with no prior search in this session), data stays undefined and the page shows
 * an explicit "open from search" empty state instead of guessing or hitting a 403.
 */
export function useTalentJobDetail(id: string | undefined) {
  return useQuery<Job>({
    queryKey: QUERY_KEYS.job(id || ""),
    queryFn: (): Promise<Job> => Promise.reject(new Error("not directly fetchable by talent")),
    enabled: false,
    retry: false,
  });
}

export function useSeedJobCache(jobs: Job[] | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    jobs?.forEach((job) => {
      queryClient.setQueryData(QUERY_KEYS.job(job._id), job);
    });
  }, [jobs, queryClient]);
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateJobPayload) => jobsApi.createJob(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs", "employer"] }),
  });
}

export function useUpdateJob(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateJobPayload) => jobsApi.updateJob(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.job(id) });
      queryClient.invalidateQueries({ queryKey: ["jobs", "employer"] });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.deleteJob(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs", "employer"] }),
  });
}

export function useCloseJob(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => jobsApi.closeJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.job(id) });
      queryClient.invalidateQueries({ queryKey: ["jobs", "employer"] });
    },
  });
}

export function useSearchJobs(query: TalentJobSearchQuery) {
  return useQuery({
    queryKey: QUERY_KEYS.talentJobSearch(query),
    queryFn: () => jobsApi.searchJobs(query),
    placeholderData: (previous) => previous,
  });
}

export function useSemanticSearchJobs(query: SemanticJobSearchQuery | null) {
  return useQuery({
    queryKey: QUERY_KEYS.semanticJobSearch(query),
    queryFn: () => jobsApi.searchJobsSemantically(query as SemanticJobSearchQuery),
    enabled: Boolean(query && query.q && query.q.trim().length >= 2),
    placeholderData: (previous) => previous,
  });
}

export function useApplyForJob(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => jobsApi.applyForJob(jobId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myApplications });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobMatch(jobId) });
    },
  });
}
