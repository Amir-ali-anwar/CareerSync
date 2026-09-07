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
