import { apiClient } from "./client";
import type { AgentWorkflow, AgentWorkflowHistoryItem } from "@/types/agent";

export const agentApi = {
  execute: (goal: string, threadId?: string) =>
    apiClient.post<{ workflow: AgentWorkflow }>("/agent/execute", { goal, threadId }).then((r) => r.data.workflow),

  listWorkflows: () =>
    apiClient.get<{ workflows: AgentWorkflowHistoryItem[] }>("/agent/workflows").then((r) => r.data.workflows),

  getWorkflow: (workflowId: string) =>
    apiClient.get<{ workflow: AgentWorkflowHistoryItem }>(`/agent/workflows/${workflowId}`).then((r) => r.data.workflow),
};
