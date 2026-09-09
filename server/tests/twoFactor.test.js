import request from "supertest";
import { authenticator } from "otplib";
import { app, talentPayload, registerVerifiedAgent } from "./helpers.js";
import User from "../models/User.js";

const enableTwoFactor = async (agent) => {
  const setupRes = await agent.post("/api/v1/auth/2fa/setup");
  const { secret } = setupRes.body;
  const token = authenticator.generate(secret);
  const verifyRes = await agent.post("/api/v1/auth/2fa/verify-setup").send({ token });
  return { secret, backupCodes: verifyRes.body.backupCodes };
};

describe("Two-factor authentication", () => {
  describe("POST /api/v1/auth/2fa/setup + verify-setup", () => {
    it("generates a QR code and secret, and enables 2FA once confirmed", async () => {
      const { agent, user } = await registerVerifiedAgent(talentPayload());

      const setupRes = await agent.post("/api/v1/auth/2fa/setup");
      expect(setupRes.statusCode).toBe(200);
      expect(setupRes.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(setupRes.body.secret).toBeTruthy();

      const token = authenticator.generate(setupRes.body.secret);
      const verifyRes = await agent.post("/api/v1/auth/2fa/verify-setup").send({ token });
      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.backupCodes).toHaveLength(8);

      const updated = await User.findById(user._id);
      expect(updated.twoFactorEnabled).toBe(true);
    });

    it("rejects an invalid confirmation code", async () => {
      const { agent } = await registerVerifiedAgent(talentPayload());
      await agent.post("/api/v1/auth/2fa/setup");

      const res = await agent.post("/api/v1/auth/2fa/verify-setup").send({ token: "000000" });
      expect(res.statusCode).toBe(400);
    });

    it("requires the current password to re-enroll once 2FA is already enabled", async () => {
      const payload = talentPayload();
      const { agent } = await registerVerifiedAgent(payload);
      await enableTwoFactor(agent);

      const noPassword = await agent.post("/api/v1/auth/2fa/setup");
      expect(noPassword.statusCode).toBe(400);

      const wrongPassword = await agent.post("/api/v1/auth/2fa/setup").send({ password: "wrong" });
      expect(wrongPassword.statusCode).toBe(401);

      const correctPassword = await agent
        .post("/api/v1/auth/2fa/setup")
        .send({ password: payload.password });
      expect(correctPassword.statusCode).toBe(200);
      expect(correctPassword.body.secret).toBeTruthy();
    });
  });

  describe("Login gate", () => {
    it("returns requiresTwoFactor instead of logging in directly once 2FA is enabled", async () => {
      const payload = talentPayload();
      const { agent } = await registerVerifiedAgent(payload);
      await enableTwoFactor(agent);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: payload.password });

      expect(res.statusCode).toBe(200);
      expect(res.body.requiresTwoFactor).toBe(true);
      expect(res.body.tempToken).toBeTruthy();
      expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("completes login with a valid TOTP code", async () => {
      const payload = talentPayload();
      const { agent } = await registerVerifiedAgent(payload);
      const { secret } = await enableTwoFactor(agent);

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: payload.password });
      const { tempToken } = loginRes.body;

      const token = authenticator.generate(secret);
      const res = await request(app).post("/api/v1/auth/2fa/login").send({ tempToken, token });

      expect(res.statusCode).toBe(200);
      expect(res.body.tokenUser).toBeTruthy();
      expect(res.headers["set-cookie"].join(";")).toMatch(/accessToken=/);
    });

    it("completes login with a backup code and consumes it (single-use)", async () => {
      const payload = talentPayload();
      const { agent } = await registerVerifiedAgent(payload);
      const { backupCodes } = await enableTwoFactor(agent);
      const backupCode = backupCodes[0];

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: payload.password });

      const firstUse = await request(app)
        .post("/api/v1/auth/2fa/login")
        .send({ tempToken: loginRes.body.tempToken, token: backupCode });
      expect(firstUse.statusCode).toBe(200);

      const secondLoginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: payload.password });
      const secondUse = await request(app)
        .post("/api/v1/auth/2fa/login")
        .send({ tempToken: secondLoginRes.body.tempToken, token: backupCode });
      expect(secondUse.statusCode).toBe(401);
    });

    it("rejects an invalid code", async () => {
      const payload = talentPayload();
      const { agent } = await registerVerifiedAgent(payload);
      await enableTwoFactor(agent);

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: payload.password });

      const res = await request(app)
        .post("/api/v1/auth/2fa/login")
        .send({ tempToken: loginRes.body.tempToken, token: "000000" });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /api/v1/auth/2fa/disable", () => {
    it("disables 2FA with the correct password and logs in normally afterward", async () => {
      const payload = talentPayload();
      const { agent, user } = await registerVerifiedAgent(payload);
      await enableTwoFactor(agent);

      const res = await agent.post("/api/v1/auth/2fa/disable").send({ password: payload.password });
      expect(res.statusCode).toBe(200);

      const updated = await User.findById(user._id);
      expect(updated.twoFactorEnabled).toBe(false);

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: payload.password });
      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.requiresTwoFactor).toBeUndefined();
    });

    it("rejects an incorrect password", async () => {
      const { agent } = await registerVerifiedAgent(talentPayload());
      await enableTwoFactor(agent);

      const res = await agent.post("/api/v1/auth/2fa/disable").send({ password: "wrong" });
      expect(res.statusCode).toBe(401);
    });
  });
});
