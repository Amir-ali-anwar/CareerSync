export type JobStatus = "pending" | "interview" | "declined";
export type JobType = "full-time" | "part-time" | "internship";
export type WorkMode = "remote" | "hybrid" | "onsite";
export type AiProcessingStatus = "pending" | "processing" | "completed" | "failed";

export interface JobLocation {
  country: string;
  city: string;
}

export interface SalaryRange {
  min?: number;
  max?: number;
  currency?: string;
}

export interface Job {
  _id: string;
  company: string;
  title: string;
  position: string;
  jobStatus: JobStatus;
  jobType: JobType;
  jobLocation: JobLocation;
  description: string;
  applicationDeadline: string | null;
  isClosed: boolean;
  createdBy: string;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredExperience?: number;
  workMode?: WorkMode;
  salaryRange?: SalaryRange;
  intelligenceProcessingStatus: AiProcessingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface JobListResponse {
  totalJobs: number;
  numOfPages: number;
  currentPage: number;
  jobs: Job[];
}

export interface CreateJobPayload {
  title: string;
  company: string;
  position?: string;
  jobType: JobType;
  jobLocation: JobLocation;
  description: string;
  applicationDeadline?: string | null;
  requiredSkills?: string[];
  preferredSkills?: string[];
  requiredExperience?: number;
  workMode?: WorkMode;
  salaryRange?: SalaryRange;
}

export type UpdateJobPayload = Partial<CreateJobPayload> & {
  jobStatus?: JobStatus;
};

export interface EmployerJobsQuery {
  search?: string;
  jobStatus?: JobStatus | "all";
  jobType?: JobType | "all";
  sort?: "newest" | "oldest" | "a-z" | "z-a";
  page?: number;
  limit?: number;
}

export interface TalentJobSearchQuery {
  search?: string;
  jobType?: JobType | "all";
  country?: string;
  sort?: "newest" | "oldest" | "a-z" | "z-a";
  page?: number;
  limit?: number;
}

export interface SemanticJobSearchQuery {
  q: string;
  workMode?: WorkMode | "all";
  jobType?: JobType | "all";
  threshold?: number;
  country?: string;
  page?: number;
  limit?: number;
}
