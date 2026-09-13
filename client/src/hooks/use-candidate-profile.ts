"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { candidateProfileApi } from "@/lib/api/candidateProfile";
import { QUERY_KEYS } from "@/constants";
import { ApiError } from "@/types/api";
import type { CandidateProfileUpdatePayload, MyMatchesQuery } from "@/types/candidateProfile";

export function useCandidateProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.myCandidateProfile,
    queryFn: candidateProfileApi.getMyProfile,
    retry: false,
  });
}

export function isProfileNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404;
}

export function useUpdateCandidateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CandidateProfileUpdatePayload) => candidateProfileApi.updateMyProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(QUERY_KEYS.myCandidateProfile, profile);
      queryClient.invalidateQueries({ queryKey: ["candidateProfile", "matches"] });
    },
  });
}

export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => candidateProfileApi.uploadResume(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myCandidateProfile });
      queryClient.invalidateQueries({ queryKey: ["candidateProfile", "matches"] });
    },
  });
}

const PROCESSING_POLL_MS = 4000;

export function useMyMatches(query: MyMatchesQuery) {
  return useQuery({
    queryKey: QUERY_KEYS.myMatches(query),
    queryFn: () => candidateProfileApi.getMyMatches(query),
    placeholderData: (previous) => previous,
    refetchInterval: (q) => {
      const status = q.state.data?.candidateProfileStatus;
      return status === "pending" || status === "processing" ? PROCESSING_POLL_MS : false;
    },
  });
}
