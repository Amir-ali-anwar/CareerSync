export type CandidateProfileStatus =
  | "available"
  | "not_found"
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type JobProfileStatus = "not_found" | "pending" | "processing" | "completed" | "failed";

/**
 * componentScores keys come from whichever matchers ran (domain, experience, preference,
 * preferredSkills, requiredSkills, semantic, seniority) - not a fixed contract. Render
 * defensively, only showing a row for a key that's actually present.
 */
export interface MatchResult {
  matchScore: number;
  classification?: { level: string; label: string; minScore?: number; maxScore?: number };
  componentScores: Record<string, number>;
  matchedSkills: string[];
  missingRequiredSkills: string[];
  matchingAlgorithmVersion: string;
  candidateProfileStatus: CandidateProfileStatus;
  jobProfileStatus: JobProfileStatus;
}

export interface JobMatchResponse {
  match: MatchResult;
}

export interface MatchExplanation {
  matchScore: number;
  matchLevel: { level: string; label: string };
  matchingAlgorithmVersion: string;
  summary: string;
  scoreBreakdown: Array<{ dimension: string; label: string; score: number | null; weight: number; included: boolean }>;
  matchedSkills: Array<{ skill: string; type: string }>;
  missingSkills: Array<{ skill: string; type: string; importance: string }>;
  partialMatches: Array<{ category: string; message: string }>;
  strengths: Array<{ category: string; message: string }>;
  improvements: Array<{ category: string; item: string; reason: string }>;
}

export interface SkillGapAnalysis {
  matchScore: number;
  matchLevel: { level: string; label: string };
  summary: {
    totalGaps: number;
    criticalGaps: number;
    highPriorityGaps: number;
    message: string;
  };
  gaps: Array<{ category: string; item: string; priority: string; severity: string; reason: string }>;
  prioritizedRoadmap: Array<{ rank: number; category: string; item: string; priority: string; impact: string }>;
}
