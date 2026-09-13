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
 * GET /jobs/talent/:id (see MISSING_BACKEND_FEATURES.md #6) returns the job if it's open,
 * or one the talent already applied to. Shares its query key with useSeedJobCache below,
 * so a job opened from a search result renders instantly from cache with no extra
 * request, while a cold cache (direct link, bookmark, refresh) falls back to this fetch
 * instead of showing an empty state.
 */
export function useTalentJobDetail(id: string | undefined) {
  return useQuery<Job>({
    queryKey: QUERY_KEYS.job(id || ""),
    queryFn: () => jobsApi.getJobForTalent(id as string),
    enabled: Boolean(id),
  });
}

export function useSkillGap(jobId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.jobSkillGap(jobId || ""),
    queryFn: () => jobsApi.getSkillGap(jobId as string),
    enabled: Boolean(jobId) && enabled,
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
