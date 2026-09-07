"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organizationsApi } from "@/lib/api/organizations";
import { QUERY_KEYS } from "@/constants";
import type { OrganizationFormPayload } from "@/types/organization";

export function useMyOrganizations() {
  return useQuery({
    queryKey: QUERY_KEYS.myOrganizations,
    queryFn: organizationsApi.getMyOrganizations,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OrganizationFormPayload) => organizationsApi.createOrganization(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myOrganizations }),
  });
}

export function useUpdateOrganization(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<OrganizationFormPayload>) =>
      organizationsApi.updateOrganization(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myOrganizations }),
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organizationsApi.deleteOrganization(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myOrganizations }),
  });
}

export function useOrganizationFollowers(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.organizationFollowers(id || ""),
    queryFn: () => organizationsApi.getOrganizationFollowers(id as string),
    enabled: Boolean(id),
  });
}

export function usePublicOrganizations() {
  return useQuery({
    queryKey: QUERY_KEYS.publicOrganizations,
    queryFn: organizationsApi.getPublicOrganizations,
  });
}

export function usePublicOrganization(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.publicOrganization(id || ""),
    queryFn: () => organizationsApi.getPublicOrganization(id as string),
    enabled: Boolean(id),
  });
}

export function useOrganizationFollowerCount(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.organizationFollowerCount(id || ""),
    queryFn: () => organizationsApi.getPublicFollowerCount(id as string),
    enabled: Boolean(id),
  });
}

export function useIsFollowingOrganization(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.isFollowingOrganization(id || ""),
    queryFn: () => organizationsApi.isFollowingOrganization(id as string),
    enabled: Boolean(id) && enabled,
  });
}

export function useFollowOrganization(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => organizationsApi.followOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.isFollowingOrganization(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizationFollowerCount(id) });
    },
  });
}
