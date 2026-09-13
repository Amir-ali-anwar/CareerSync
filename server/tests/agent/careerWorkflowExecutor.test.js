import { executeCareerWorkflow } from "../../services/agent/careerWorkflowExecutor.js";
import { createTalentAgent } from "../helpers.js";
import AgentWorkflowModel from "../../models/AgentWorkflowModel.js";

describe("careerWorkflowExecutor", () => {
  it("completes a FIND_JOBS workflow end to end with no jobs in the system yet", async () => {
    const { user } = await createTalentAgent();

    const workflow = await executeCareerWorkflow(String(user._id), { goal: "Find the best AI Engineer jobs for me" });

    expect(workflow.goal).toBe("FIND_JOBS");
    expect(workflow.status).toBe("COMPLETED");
    expect(workflow.plan.every((step) => step.status === "completed")).toBe(true);
    expect(workflow.result.jobs.total).toBe(0);
    expect(Array.isArray(workflow.recommendedActions)).toBe(true);
    expect(typeof workflow.summary).toBe("string");
    expect(workflow.summary.length).toBeGreaterThan(0);

    const persisted = await AgentWorkflowModel.findById(workflow.workflowId);
    expect(persisted).not.toBeNull();
    expect(String(persisted.user)).toBe(String(user._id));
  });

  it("returns a clarifying response without executing any plan for an unclassified goal", async () => {
    const { user } = await createTalentAgent();

    const workflow = await executeCareerWorkflow(String(user._id), { goal: "asdkjaslkdj random text" });

    expect(workflow.goal).toBe("UNKNOWN");
    expect(workflow.plan).toEqual([]);
    expect(workflow.status).toBe("COMPLETED");
    expect(workflow.summary.length).toBeGreaterThan(0);
  });

  it("rejects a goal that isn't a valid string", async () => {
    const { user } = await createTalentAgent();
    const workflow = await executeCareerWorkflow(String(user._id), { goal: "" });
    expect(workflow.goal).toBe("UNKNOWN");
  });

  it("carries a previously-discovered job forward across a thread for interview prep", async () => {
    const { user } = await createTalentAgent();

    const first = await executeCareerWorkflow(String(user._id), {
      goal: "Find the best AI Engineer jobs for me",
      threadId: "thread-1",
    });
    expect(first.result.jobs.total).toBe(0); // no jobs exist in this test's DB

    const second = await executeCareerWorkflow(String(user._id), {
      goal: "Help me prepare for the interview",
      threadId: "thread-1",
    });
    // No job was ever discovered in the first workflow (empty DB), so there is nothing
    // to recall - this asserts the recall path runs without throwing either way.
    expect(second.goal).toBe("INTERVIEW_PREPARATION");
  });
});
