import request from "supertest";
import { app, talentPayload, registerVerifiedAgent } from "./helpers.js";
import Token from "../models/Token.js";

const loginNewAgent = async (payload) => {
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login").send({ email: payload.email, password: payload.password });
  return agent;
};

describe("Session / device management", () => {
  describe("GET /api/v1/auth/sessions", () => {
    it("lists the current session and flags it as current", async () => {
      const { agent } = await registerVerifiedAgent(talentPayload());
      const res = await agent.get("/api/v1/auth/sessions");

      expect(res.statusCode).toBe(200);
      expect(res.body.sessions).toHaveLength(1);
      expect(res.body.sessions[0].isCurrent).toBe(true);
    });

    it("lists every concurrent session across devices, each correctly flagged", async () => {
      const payload = talentPayload();
      const { agent: deviceA } = await registerVerifiedAgent(payload);
      const deviceB = await loginNewAgent(payload);

      const resFromA = await deviceA.get("/api/v1/auth/sessions");
      expect(resFromA.body.sessions).toHaveLength(2);
      const currentInA = resFromA.body.sessions.find((s) => s.isCurrent);
      expect(currentInA).toBeTruthy();

      const resFromB = await deviceB.get("/api/v1/auth/sessions");
      expect(resFromB.body.sessions).toHaveLength(2);
      const currentInB = resFromB.body.sessions.find((s) => s.isCurrent);
      expect(currentInB.id).not.toBe(currentInA.id);
    });
  });

  describe("DELETE /api/v1/auth/sessions/:id", () => {
    it("revokes one session by id, leaving the other device logged in", async () => {
      const payload = talentPayload();
      const { agent: deviceA } = await registerVerifiedAgent(payload);
      const deviceB = await loginNewAgent(payload);

      const sessions = (await deviceA.get("/api/v1/auth/sessions")).body.sessions;
      const deviceBSession = sessions.find((s) => !s.isCurrent);

      const res = await deviceA.delete(`/api/v1/auth/sessions/${deviceBSession.id}`);
      expect(res.statusCode).toBe(200);

      const bRefresh = await deviceB.post("/api/v1/auth/refresh-token");
      expect(bRefresh.statusCode).toBe(401);

      const aRefresh = await deviceA.post("/api/v1/auth/refresh-token");
      expect(aRefresh.statusCode).toBe(200);
    });

    it("404s when the session belongs to a different user", async () => {
      const { agent: agentA } = await registerVerifiedAgent(talentPayload());
      const { agent: agentB } = await registerVerifiedAgent(talentPayload());

      const bSessions = (await agentB.get("/api/v1/auth/sessions")).body.sessions;
      const res = await agentA.delete(`/api/v1/auth/sessions/${bSessions[0].id}`);
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/v1/auth/sessions", () => {
    it("revokes every other session but keeps the current one alive", async () => {
      const payload = talentPayload();
      const { agent: deviceA } = await registerVerifiedAgent(payload);
      const deviceB = await loginNewAgent(payload);
      const deviceC = await loginNewAgent(payload);

      const res = await deviceA.delete("/api/v1/auth/sessions");
      expect(res.statusCode).toBe(200);

      expect((await deviceA.post("/api/v1/auth/refresh-token")).statusCode).toBe(200);
      expect((await deviceB.post("/api/v1/auth/refresh-token")).statusCode).toBe(401);
      expect((await deviceC.post("/api/v1/auth/refresh-token")).statusCode).toBe(401);
    });
  });

  describe("Multi-session login/refresh/logout", () => {
    it("logging in from a second device does not revoke the first device's session", async () => {
      const payload = talentPayload();
      const { agent: deviceA } = await registerVerifiedAgent(payload);
      await loginNewAgent(payload);

      const res = await deviceA.post("/api/v1/auth/refresh-token");
      expect(res.statusCode).toBe(200);
    });

    it("logging out from one device does not affect another device's session", async () => {
      const payload = talentPayload();
      const { agent: deviceA } = await registerVerifiedAgent(payload);
      const deviceB = await loginNewAgent(payload);

      await deviceA.get("/api/v1/auth/logout");

      expect((await deviceA.post("/api/v1/auth/refresh-token")).statusCode).toBe(401);
      expect((await deviceB.post("/api/v1/auth/refresh-token")).statusCode).toBe(200);
    });
  });
});
