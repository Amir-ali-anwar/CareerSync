"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { talentsApi } from "@/lib/api/talents";
import { QUERY_KEYS } from "@/constants";

export function useTalents(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...QUERY_KEYS.talents(page), limit],
    queryFn: () => talentsApi.getAllTalents(page, limit),
    placeholderData: (previous) => previous,
  });
}

export function useTalent(talentId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.talent(talentId || ""),
    queryFn: () => talentsApi.getTalentById(talentId as string),
    enabled: Boolean(talentId),
  });
}

export function useExportTalentApplications() {
  return useMutation({
    mutationFn: async () => {
      const blob = await talentsApi.exportApplications();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "job-applications.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    },
  });
}
