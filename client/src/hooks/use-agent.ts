"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants";
import { agentApi } from "@/lib/api/agent";

export function useExecuteAgentWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goal, threadId }: { goal: string; threadId?: string }) => agentApi.execute(goal, threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agentWorkflows });
    },
  });
}

export function useAgentWorkflowHistory() {
  return useQuery({
    queryKey: QUERY_KEYS.agentWorkflows,
    queryFn: agentApi.listWorkflows,
  });
}
