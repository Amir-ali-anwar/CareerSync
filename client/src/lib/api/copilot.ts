import { apiClient } from "./client";
import type { CareerInsights, CopilotResponse } from "@/types/copilot";

export const copilotApi = {
  getInsights: () => apiClient.get<{ insights: CareerInsights }>("/copilot/insights").then((r) => r.data.insights),
  query: (message: string) => apiClient.post<CopilotResponse>("/copilot/query", { message }).then((r) => r.data),
};
