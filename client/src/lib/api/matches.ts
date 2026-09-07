import { apiClient } from "./client";
import type { JobMatchResponse, MatchResult } from "@/types/match";

export const matchesApi = {
  getJobMatch: (jobId: string) =>
    apiClient.get<JobMatchResponse>(`/jobs/${jobId}/match`).then((r) => r.data.match as MatchResult),
};
