import type { AiProcessingStatus } from "./job";

export type WorkModePreference = "remote" | "hybrid" | "onsite" | "any";

export interface EducationEntry {
  degree?: string;
  field?: string;
  institution?: string;
  graduationYear?: number;
}

export interface CandidateProfile {
  _id: string;
  user: string;
  skills: string[];
  yearsOfExperience?: number;
  education: EducationEntry[];
  certifications: string[];
  domains: string[];
  preferredRoles: string[];
  preferredLocations: string[];
  workModePreference: WorkModePreference;
  resumeMetadata?: {
    fileName?: string;
    originalFileName?: string;
    extractedAt?: string;
  };
  processingStatus: AiProcessingStatus;
  processingError?: string;
  profileVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateProfileUpdatePayload {
  skills?: string[];
  yearsOfExperience?: number;
  education?: EducationEntry[];
  certifications?: string[];
  domains?: string[];
  preferredRoles?: string[];
  preferredLocations?: string[];
  workModePreference?: WorkModePreference;
}

export interface MatchedJobSummary {
  job: import("./job").Job;
  matchScore: number;
  componentScores: Record<string, number>;
  matchedSkills: string[];
  missingRequiredSkills: string[];
  matchingAlgorithmVersion: string;
  jobProfileStatus: string;
}

export interface MyMatchesResponse {
  totalJobs: number;
  numOfPages: number;
  currentPage: number;
  candidateProfileStatus: string;
  matches: MatchedJobSummary[];
}

export interface MyMatchesQuery {
  page?: number;
  limit?: number;
  minScore?: number;
}
