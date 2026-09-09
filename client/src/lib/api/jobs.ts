import { apiClient } from "./client";
import type {
  CreateJobPayload,
  EmployerJobsQuery,
  Job,
  JobListResponse,
  SemanticJobSearchQuery,
  TalentJobSearchQuery,
  UpdateJobPayload,
} from "@/types/job";
import type { JobApplication } from "@/types/application";

export const jobsApi = {
  // Employer
  createJob: (payload: CreateJobPayload) =>
    apiClient.post<{ job: Job }>("/jobs", payload).then((r) => r.data.job),

  getEmployerJobs: (query: EmployerJobsQuery) =>
    apiClient.get<JobListResponse>("/jobs", { params: query }).then((r) => r.data),

  getJob: (id: string) => apiClient.get<{ job: Job }>(`/jobs/${id}`).then((r) => r.data.job),

  // Talent: single job, open (or already-applied-to) only - see MISSING_BACKEND_FEATURES.md #6
  getJobForTalent: (id: string) =>
    apiClient.get<{ job: Job }>(`/jobs/talent/${id}`).then((r) => r.data.job),

  updateJob: (id: string, payload: UpdateJobPayload) =>
    apiClient
      .patch<{ msg: string; job: Job }>(`/jobs/${id}`, payload)
      .then((r) => r.data.job),

  deleteJob: (id: string) => apiClient.delete<{ msg: string }>(`/jobs/${id}`).then((r) => r.data),

  closeJob: (jobId: string) =>
    apiClient.patch<{ msg: string }>(`/jobs/${jobId}/close`).then((r) => r.data),

  // Talent
  searchJobs: (query: TalentJobSearchQuery) =>
    apiClient.get<JobListResponse>("/jobs/search", { params: query }).then((r) => r.data),

  searchJobsSemantically: (query: SemanticJobSearchQuery) =>
    apiClient
      .get<JobListResponse>("/jobs/search/semantic", { params: query })
      .then((r) => r.data),

  applyForJob: (jobId: string, formData: FormData) =>
    apiClient
      .post<{ msg: string; application: JobApplication }>(
        `/jobs/applyForJob/${jobId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      .then((r) => r.data),
};
