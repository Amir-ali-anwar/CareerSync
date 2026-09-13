import type { ApplicationStatus } from "@/types/application";
import type { JobType } from "@/types/job";

export const APP_NAME = "CareerSync";
export const APP_TAGLINE = "Your Career. Connected.";

export const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "internship", label: "Internship" },
];

export const WORK_MODES: { value: string; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

export const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "expert", label: "Expert" },
];

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "under review", label: "Under Review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] as const;

export const ORGANIZATION_TYPES = [
  "Private",
  "Public",
  "Non-Profit",
  "Startup",
  "Government",
  "Other",
] as const;

export const CV_ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const CV_ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];
export const CV_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const QUERY_KEYS = {
  currentUser: ["currentUser"] as const,
  employerJobs: (query?: unknown) => ["jobs", "employer", query] as const,
  job: (id: string) => ["jobs", "detail", id] as const,
  talentJobSearch: (query?: unknown) => ["jobs", "search", query] as const,
  semanticJobSearch: (query?: unknown) => ["jobs", "semantic-search", query] as const,
  jobMatch: (jobId: string) => ["match", jobId] as const,
  jobMatchExplanation: (jobId: string) => ["match", jobId, "explanation"] as const,
  jobSkillGap: (jobId: string) => ["match", jobId, "skill-gap"] as const,
  myApplications: ["applications", "mine"] as const,
  jobApplications: (jobId: string) => ["applications", "job", jobId] as const,
  talents: (page?: number) => ["talents", page] as const,
  talent: (id: string) => ["talents", "detail", id] as const,
  myOrganizations: ["organizations", "mine"] as const,
  publicOrganizations: ["organizations", "public"] as const,
  publicOrganization: (id: string) => ["organizations", "public", id] as const,
  organizationFollowers: (id: string) => ["organizations", id, "followers"] as const,
  isFollowingOrganization: (id: string) => ["organizations", id, "is-following"] as const,
  organizationFollowerCount: (id: string) => ["organizations", id, "follower-count"] as const,
  myCandidateProfile: ["candidateProfile", "mine"] as const,
  myMatches: (query?: unknown) => ["candidateProfile", "matches", query] as const,
  notifications: ["notifications"] as const,
  careerInsights: ["copilot", "insights"] as const,
  agentWorkflows: ["agent", "workflows"] as const,
};
