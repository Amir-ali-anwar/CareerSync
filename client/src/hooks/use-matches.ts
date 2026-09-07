"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { matchesApi } from "@/lib/api/matches";
import { QUERY_KEYS } from "@/constants";
import type { AiProcessingStatus } from "@/types/job";

const POLL_INTERVAL_MS = 4000;

function isProcessing(status: string | undefined) {
  return status === "pending" || status === "processing";
}

export function useJobMatch(jobId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.jobMatch(jobId || ""),
    queryFn: () => matchesApi.getJobMatch(jobId as string),
    enabled: Boolean(jobId) && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        data &&
        (isProcessing(data.candidateProfileStatus) || isProcessing(data.jobProfileStatus as AiProcessingStatus))
      ) {
        return POLL_INTERVAL_MS;
      }
      return false;
    },
  });
}

/** Lazily fetches match scores for a capped set of job ids (used by /matches and dashboards) - never fans out across an entire result set at once. */
export function useJobMatches(jobIds: string[]) {
  return useQueries({
    queries: jobIds.map((jobId) => ({
      queryKey: QUERY_KEYS.jobMatch(jobId),
      queryFn: () => matchesApi.getJobMatch(jobId),
      staleTime: 60_000,
    })),
  });
}
