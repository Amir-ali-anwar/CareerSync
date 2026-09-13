import request from "supertest";
import { app, createEmployerAgent, createTalentAgent } from "./helpers.js";

describe("Career Copilot API", () => {
  it("rejects unauthenticated insight requests", async () => {
    const res = await request(app).get("/api/v1/copilot/insights");
    expect(res.statusCode).toBe(401);
  });

  it("rejects empty Copilot questions", async () => {
    const { agent } = await createTalentAgent();
    const res = await agent.post("/api/v1/copilot/query").send({ message: " " });
    expect(res.statusCode).toBe(400);
  });

  it("rejects employer access to talent Copilot routes", async () => {
    const { agent } = await createEmployerAgent();
    const res = await agent.get("/api/v1/copilot/insights");
    expect(res.statusCode).toBe(403);
  });

  it("returns grounded profile readiness guidance", async () => {
    const { agent } = await createTalentAgent();
    const res = await agent.post("/api/v1/copilot/query").send({ message: "How ready is my profile?" });
    expect(res.statusCode).toBe(200);
    expect(res.body.intent).toBe("PROFILE");
    expect(res.body.answer).toMatch(/readiness/i);
    expect(res.body.references).toEqual(expect.arrayContaining([expect.objectContaining({ type: "candidate_profile" })]));
  });
});
