import type { Job } from "./job";
import type { MatchResult } from "./match";

export type ApplicationStatus =
  | "pending"
  | "under review"
  | "shortlisted"
  | "interview"
  | "rejected"
  | "withdrawn";

export type ExperienceLevel = "beginner" | "intermediate" | "expert";
export type ResumeProcessingStatus = "pending" | "processing" | "completed" | "failed";

export interface ApplicationTalent {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
}

export interface JobApplication {
  _id: string;
  job: string | Job;
  talent: string | ApplicationTalent;
  status: ApplicationStatus;
  Jobtitle?: string;
  cv: string;
  coverLetter?: string;
  portfolio?: string | null;
  linkedInProfile?: string;
  skills?: string[];
  experienceLevel: ExperienceLevel;
  availability?: string;
  locationPreferences?: string;
  references?: string[];
  appliedAt: string;
  resumeProcessingStatus: ResumeProcessingStatus;
  resumeProcessingError?: string;
  createdAt: string;
  updatedAt: string;
  /** Only present on employer views (GET /applications/job/:jobId) */
  match?: MatchResult;
}

export interface MyApplicationsResponse {
  TotalSubmittedApplications: number;
  ActiveApplications: number;
  applications: JobApplication[];
}

export interface JobApplicationsResponse {
  applications: JobApplication[];
}

export interface ApplyForJobPayload {
  cv: File;
  coverLetter?: string;
  portfolio?: string;
  linkedInProfile?: string;
  skills?: string[];
  experienceLevel?: ExperienceLevel;
  availability?: string;
  locationPreferences?: string;
  references?: string[];
}

export const MUTABLE_APPLICATION_STATUSES: ApplicationStatus[] = [
  "pending",
  "under review",
  "shortlisted",
  "interview",
  "rejected",
];

export const WITHDRAWABLE_STATUSES: ApplicationStatus[] = ["pending", "under review"];
