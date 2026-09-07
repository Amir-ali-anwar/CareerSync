"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applicationsApi } from "@/lib/api/applications";
import { QUERY_KEYS } from "@/constants";
import type { ApplicationStatus } from "@/types/application";

export function useMyApplications() {
  return useQuery({
    queryKey: QUERY_KEYS.myApplications,
    queryFn: applicationsApi.getMyApplications,
  });
}

export function useJobApplications(jobId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.jobApplications(jobId || ""),
    queryFn: () => applicationsApi.getJobApplications(jobId as string),
    enabled: Boolean(jobId),
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      applicantId,
      status,
    }: {
      jobId: string;
      applicantId: string;
      status: ApplicationStatus;
    }) => applicationsApi.updateApplicationStatus(jobId, applicantId, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobApplications(variables.jobId) });
      queryClient.invalidateQueries({ queryKey: ["talents"] });
    },
  });
}

export function useWithdrawApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => applicationsApi.withdrawApplication(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myApplications }),
  });
}

export function useDownloadCv() {
  return useMutation({
    mutationFn: async (id: string) => {
      const blob = await applicationsApi.downloadApplicationCv(id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    },
  });
}
