// Isolated in its own file so the aiService mock never affects other agent tests (same
// pattern as resumeProcessingService.test.js's aiService wrapper mock).
jest.mock("../../services/ai/index.js", () => {
  const actual = jest.requireActual("../../services/ai/index.js");
  return {
    __esModule: true,
    default: {
      ...actual.default,
      generateCareerNarrative: jest.fn(async () => {
        throw new Error("LLM provider unavailable");
      }),
    },
  };
});

import { executeCareerWorkflow } from "../../services/agent/careerWorkflowExecutor.js";
import { createTalentAgent } from "../helpers.js";
import AgentWorkflowModel from "../../models/AgentWorkflowModel.js";

describe("careerWorkflowExecutor - narrative fallback", () => {
  it("falls back to a deterministic narrative when the LLM narrative call fails, without failing the workflow", async () => {
    const { user } = await createTalentAgent();

    const workflow = await executeCareerWorkflow(String(user._id), { goal: "Find the best AI Engineer jobs for me" });

    expect(workflow.status).toBe("COMPLETED");
    expect(workflow.summary.length).toBeGreaterThan(0);

    const persisted = await AgentWorkflowModel.findById(workflow.workflowId);
    expect(persisted.narrativeSource).toBe("deterministic_fallback");
  });
});
