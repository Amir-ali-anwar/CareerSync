import request from "supertest";
import { app, createEmployerAgent, createTalentAgent } from "./helpers.js";

describe("Agentic Career Workflow API", () => {
  it("rejects an unauthenticated execute request", async () => {
    const res = await request(app).post("/api/v1/agent/execute").send({ goal: "Find me jobs" });
    expect(res.statusCode).toBe(401);
  });

  it("rejects employer access to the talent-only agent routes", async () => {
    const { agent } = await createEmployerAgent();
    const res = await agent.post("/api/v1/agent/execute").send({ goal: "Find me jobs" });
    expect(res.statusCode).toBe(403);
  });

  it("rejects an empty goal", async () => {
    const { agent } = await createTalentAgent();
    const res = await agent.post("/api/v1/agent/execute").send({ goal: "   " });
    expect(res.statusCode).toBe(400);
  });

  it("rejects a goal exceeding the max length", async () => {
    const { agent } = await createTalentAgent();
    const res = await agent.post("/api/v1/agent/execute").send({ goal: "a".repeat(1001) });
    expect(res.statusCode).toBe(400);
  });

  it("executes a FIND_JOBS workflow and returns a structured, grounded result", async () => {
    const { agent } = await createTalentAgent();
    const res = await agent.post("/api/v1/agent/execute").send({ goal: "Find the best AI Engineer jobs for me" });

    expect(res.statusCode).toBe(200);
    expect(res.body.workflow.goal).toBe("FIND_JOBS");
    expect(["COMPLETED", "PARTIAL"]).toContain(res.body.workflow.status);
    expect(Array.isArray(res.body.workflow.plan)).toBe(true);
    expect(Array.isArray(res.body.workflow.recommendedActions)).toBe(true);
    expect(typeof res.body.workflow.summary).toBe("string");
    expect(res.body.workflow.workflowId).toBeTruthy();
  });

  it("lists the caller's own workflow history, newest first", async () => {
    const { agent } = await createTalentAgent();
    await agent.post("/api/v1/agent/execute").send({ goal: "Find the best AI Engineer jobs for me" });
    await agent.post("/api/v1/agent/execute").send({ goal: "What are my biggest skill gaps?" });

    const res = await agent.get("/api/v1/agent/workflows");
    expect(res.statusCode).toBe(200);
    expect(res.body.workflows.length).toBe(2);
    expect(res.body.workflows[0].goal).toBe("ANALYZE_SKILL_GAPS");
  });

  it("fetches a single owned workflow by id", async () => {
    const { agent } = await createTalentAgent();
    const created = await agent.post("/api/v1/agent/execute").send({ goal: "Find the best AI Engineer jobs for me" });
    const workflowId = created.body.workflow.workflowId;

    const res = await agent.get(`/api/v1/agent/workflows/${workflowId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.workflow._id).toBe(workflowId);
  });

  it("404s (not 403) when fetching another user's workflow - a workflow id is never advertised across users", async () => {
    const { agent: ownerAgent } = await createTalentAgent();
    const created = await ownerAgent.post("/api/v1/agent/execute").send({ goal: "Find the best AI Engineer jobs for me" });
    const workflowId = created.body.workflow.workflowId;

    const { agent: otherAgent } = await createTalentAgent();
    const res = await otherAgent.get(`/api/v1/agent/workflows/${workflowId}`);
    expect(res.statusCode).toBe(404);
  });

  it("400s on a malformed workflow id instead of throwing an unhandled cast error", async () => {
    const { agent } = await createTalentAgent();
    const res = await agent.get("/api/v1/agent/workflows/not-a-valid-id");
    expect(res.statusCode).toBe(400);
  });
});
