import { apiClient } from "./client";
import type {
  CandidateProfile,
  CandidateProfileUpdatePayload,
  MyMatchesQuery,
  MyMatchesResponse,
} from "@/types/candidateProfile";

export const candidateProfileApi = {
  getMyProfile: () =>
    apiClient.get<{ profile: CandidateProfile }>("/candidate-profile").then((r) => r.data.profile),

  updateMyProfile: (payload: CandidateProfileUpdatePayload) =>
    apiClient
      .patch<{ msg: string; profile: CandidateProfile }>("/candidate-profile", payload)
      .then((r) => r.data.profile),

  uploadResume: (formData: FormData) =>
    apiClient
      .post<{ msg: string }>("/candidate-profile/resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data),

  getMyMatches: (query: MyMatchesQuery) =>
    apiClient.get<MyMatchesResponse>("/candidate-profile/matches", { params: query }).then((r) => r.data),
};
