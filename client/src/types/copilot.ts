export interface CareerInsightReference {
  type: "job" | "application" | "skill" | "candidate_profile";
  jobId?: string;
  applicationId?: string;
  skill?: string;
  matchScore?: number;
}

export interface CareerInsights {
  readiness: {
    score: number;
    breakdown: Record<string, boolean>;
  };
  applications: {
    total: number;
    active: number;
    needingAttention: Array<{
      applicationId: string;
      jobId?: string;
      company?: string;
      role?: string;
      status: string;
      appliedAt: string;
      matchScore: number | null;
      priority: string;
      reason: string;
      recommendedAction: string;
    }>;
    averageMatchScore: number | null;
  };
  skillGaps: Array<{ skill: string; jobs: number; missing: number; frequency: number }>;
  recommendations: Array<{ type: string; text: string; applicationId?: string; jobId?: string | null }>;
}

export interface CopilotResponse {
  intent: string;
  answer: string;
  insights: CareerInsights["recommendations"];
  references: CareerInsightReference[];
}
