"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants";
import { copilotApi } from "@/lib/api/copilot";

export function useCareerInsights() {
  return useQuery({
    queryKey: QUERY_KEYS.careerInsights,
    queryFn: copilotApi.getInsights,
  });
}

export function useCareerCopilotQuery() {
  return useMutation({
    mutationFn: (message: string) => copilotApi.query(message),
  });
}
