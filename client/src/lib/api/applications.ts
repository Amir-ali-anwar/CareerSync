import { apiClient } from "./client";
import type {
  ApplicationStatus,
  JobApplicationsResponse,
  MyApplicationsResponse,
} from "@/types/application";

export const applicationsApi = {
  getMyApplications: () =>
    apiClient.get<MyApplicationsResponse>("/applications/my").then((r) => r.data),

  getJobApplications: (jobId: string) =>
    apiClient
      .get<JobApplicationsResponse>(`/applications/job/${jobId}`)
      .then((r) => r.data.applications),

  updateApplicationStatus: (jobId: string, applicantId: string, status: ApplicationStatus) =>
    apiClient
      .patch<{ message: string; status: ApplicationStatus }>(
        `/applications/${jobId}/${applicantId}/status`,
        { status }
      )
      .then((r) => r.data),

  withdrawApplication: (id: string) =>
    apiClient.patch<{ msg: string }>(`/applications/${id}/withdraw`).then((r) => r.data),

  getApplicationCvUrl: (id: string) =>
    `${apiClient.defaults.baseURL}/applications/${id}/cv`,

  downloadApplicationCv: (id: string) =>
    apiClient
      .get(`/applications/${id}/cv`, { responseType: "blob" })
      .then((r) => r.data as Blob),
};
