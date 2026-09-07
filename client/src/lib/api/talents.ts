import { apiClient } from "./client";
import type { TalentDetailResponse, TalentsListResponse } from "@/types/talent";

export const talentsApi = {
  getAllTalents: (page = 1, limit = 10) =>
    apiClient
      .get<TalentsListResponse>("/talents", { params: { page, limit } })
      .then((r) => r.data),

  getTalentById: (talentId: string) =>
    apiClient.get<TalentDetailResponse>(`/talents/${talentId}`).then((r) => r.data.talent),

  exportApplications: () =>
    apiClient
      .get("/talents/export-applications", { responseType: "blob" })
      .then((r) => r.data as Blob),
};
