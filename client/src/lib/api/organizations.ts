import { apiClient } from "./client";
import type {
  Organization,
  OrganizationFollower,
  OrganizationFormPayload,
  OrganizationListResponse,
  PublicOrganizationListResponse,
} from "@/types/organization";

export const organizationsApi = {
  createOrganization: (payload: OrganizationFormPayload) =>
    apiClient
      .post<{ msg: string; newOrganization: Organization }>("/organization", payload)
      .then((r) => r.data.newOrganization),

  getMyOrganizations: () =>
    apiClient.get<OrganizationListResponse>("/organization").then((r) => r.data),

  updateOrganization: (id: string, payload: Partial<OrganizationFormPayload>) =>
    apiClient
      .patch<{ msg: string; organization: Organization }>(`/organization/${id}`, payload)
      .then((r) => r.data.organization),

  deleteOrganization: (id: string) =>
    apiClient.delete<{ msg: string }>(`/organization/${id}`).then((r) => r.data),

  followOrganization: (id: string) =>
    apiClient.post<{ message: string }>(`/organization/${id}/follow`).then((r) => r.data),

  getOrganizationFollowers: (id: string) =>
    apiClient
      .get<{ followers: OrganizationFollower[] }>(`/organization/${id}/followers`)
      .then((r) => r.data.followers),

  isFollowingOrganization: (id: string) =>
    apiClient
      .get<{ isFollowing: boolean }>(`/organization/${id}/is-following`)
      .then((r) => r.data.isFollowing),

  getPublicOrganizations: () =>
    apiClient
      .get<PublicOrganizationListResponse>("/organization/public")
      .then((r) => r.data),

  getPublicOrganization: (id: string) =>
    apiClient
      .get<{ organization: Organization }>(`/organization/public/${id}`)
      .then((r) => r.data.organization),

  getPublicFollowerCount: (id: string) =>
    apiClient
      .get<{ followerCount: number }>(`/organization/public-organizations/${id}/followers/count`)
      .then((r) => r.data.followerCount),
};
