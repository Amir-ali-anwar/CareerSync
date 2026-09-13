// Separate file (not a describe block inside careerWorkflowExecutor.test.js) so this
// file's module-level mock of skillGap.tools.js never leaks into other agent tests -
// same isolation-by-file pattern already used for the AI-provider mock in
// resumeProcessingService.test.js.
jest.mock("../../services/agent/tools/skillGap.tools.js", () => ({
  analyzeSkillGaps: jest.fn(async () => {
    throw new Error("skill gap service unavailable");
  }),
}));

import { executeCareerWorkflow } from "../../services/agent/careerWorkflowExecutor.js";
import { createTalentAgent } from "../helpers.js";

describe("careerWorkflowExecutor - partial failure", () => {
  it("marks the workflow PARTIAL, not FAILED, when one step fails but others succeed", async () => {
    const { user } = await createTalentAgent();

    const workflow = await executeCareerWorkflow(String(user._id), { goal: "Find the best AI Engineer jobs for me" });

    expect(workflow.status).toBe("PARTIAL");
    const skillsStep = workflow.plan.find((step) => step.action === "ANALYZE_SKILLS");
    expect(skillsStep.status).toBe("failed");
    expect(skillsStep.error).toMatch(/unavailable/i);
    // The steps that succeeded still contribute real (not faked) results.
    expect(workflow.result.candidateProfile).toBeDefined();
    expect(workflow.result.jobs).toBeDefined();
    expect(workflow.result.skillGaps).toBeUndefined();
  });
});
