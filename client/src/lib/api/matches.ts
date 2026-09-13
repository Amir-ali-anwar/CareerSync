import { apiClient } from "./client";
import type { JobMatchResponse, MatchExplanation, MatchResult } from "@/types/match";

export const matchesApi = {
  getJobMatch: (jobId: string) =>
    apiClient.get<JobMatchResponse>(`/jobs/${jobId}/match`).then((r) => r.data.match as MatchResult),

  getJobMatchExplanation: (jobId: string) =>
    apiClient
      .get<{ explanation: MatchExplanation }>(`/jobs/${jobId}/match/explanation`)
      .then((r) => r.data.explanation),
};
