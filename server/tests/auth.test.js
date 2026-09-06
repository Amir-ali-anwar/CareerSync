import request from "supertest";
import { app, talentPayload, employerPayload, registerUser, verifyUser, registerVerifiedAgent } from "./helpers.js";
import User from "../models/User.js";
import Token from "../models/Token.js";
import sendVerificationEmail from "../utils/sendVerificationEmail.js";

describe("Authentication & User Management", () => {
  describe("POST /api/v1/auth/register", () => {
    it("registers a talent successfully", async () => {
      const res = await registerUser(talentPayload());
      expect(res.statusCode).toBe(201);
      expect(res.body.msg).toMatch(/verify/i);
    });

    it("still creates the account and returns 201 even if the verification email fails to send", async () => {
      sendVerificationEmail.mockRejectedValueOnce(new Error("SMTP unavailable"));
      const payload = talentPayload();
      const res = await registerUser(payload);
      expect(res.statusCode).toBe(201);
      // Wait a tick for the fire-and-forget send's rejection to be handled/logged.
      await new Promise((resolve) => setImmediate(resolve));
      expect(await User.findOne({ email: payload.email })).not.toBeNull();
    });

    it("registers an employer with company fields", async () => {
      const res = await registerUser(employerPayload());
      expect(res.statusCode).toBe(201);
      const saved = await User.findOne({ role: "employer" });
      expect(saved.companyName).toBe("Tech Corp");
    });

    it("rejects registration missing required fields", async () => {
      const payload = talentPayload();
      delete payload.phone;
      const res = await registerUser(payload);
      expect(res.statusCode).toBe(400);
    });

    it("rejects employer registration missing companyName/companySize/industry", async () => {
      const payload = employerPayload();
      delete payload.companyName;
      const res = await registerUser(payload);
      expect(res.statusCode).toBe(400);
    });

    it("rejects duplicate email registration", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      const res = await registerUser(payload);
      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toMatch(/already exists/i);
    });

    it("hashes the password (never stores plaintext)", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      const saved = await User.findOne({ email: payload.email }).select("+password");
      expect(saved.password).not.toBe(payload.password);
      expect(await saved.comparePassword(payload.password)).toBe(true);
    });

    it("excludes the password hash from a default query (select: false)", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      const saved = await User.findOne({ email: payload.email });
      expect(saved.password).toBeUndefined();
    });
  });

  describe("GET /api/v1/auth/verify-Email", () => {
    it("rejects an incorrect verification token", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      const res = await request(app)
        .get("/api/v1/auth/verify-Email")
        .query({ email: payload.email, verificationToken: "wrong-token" });
      expect(res.statusCode).toBe(401);
    });

    it("rejects an expired verification token", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      await User.findOneAndUpdate(
        { email: payload.email },
        { verificationTokenExpires: new Date(Date.now() - 1000) }
      );
      const user = await User.findOne({ email: payload.email });
      const res = await request(app)
        .get("/api/v1/auth/verify-Email")
        .query({ email: payload.email, verificationToken: user.verificationToken });
      expect(res.statusCode).toBe(401);
      expect(res.body.msg).toMatch(/expired/i);
    });

    it("verifies successfully with a valid token", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      const user = await verifyUser(payload.email);
      expect(user.isVerified).toBe(true);
    });
  });

  describe("POST /api/v1/auth/resend-verification", () => {
    it("rejects unknown email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/resend-verification")
        .send({ email: "nobody@example.com" });
      expect(res.statusCode).toBe(401);
    });

    it("rejects an already-verified account", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      await verifyUser(payload.email);
      const res = await request(app)
        .post("/api/v1/auth/resend-verification")
        .send({ email: payload.email });
      expect(res.statusCode).toBe(400);
    });

    it("resends successfully for an unverified account", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      const res = await request(app)
        .post("/api/v1/auth/resend-verification")
        .send({ email: payload.email });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("rejects missing credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({ email: "a@b.com" });
      expect(res.statusCode).toBe(400);
    });

    it("rejects an unverified account", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: payload.password });
      expect(res.statusCode).toBe(401);
      expect(res.body.msg).toMatch(/verify/i);
    });

    it("rejects an incorrect password", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      await verifyUser(payload.email);
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: "wrong-password" });
      expect(res.statusCode).toBe(401);
    });

    it("logs in successfully and sets signed httpOnly cookies", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      await verifyUser(payload.email);
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: payload.password });
      expect(res.statusCode).toBe(200);
      const cookies = res.headers["set-cookie"].join(";");
      expect(cookies).toMatch(/accessToken=/);
      expect(cookies).toMatch(/refreshToken=/);
      expect(cookies).toMatch(/HttpOnly/i);

      const token = await Token.findOne({ user: res.body.tokenUser.userId });
      expect(token).not.toBeNull();
      expect(token.isValid).toBe(true);
    });

    it("persists only a hashed refresh token - never the raw secret - in the database", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      await verifyUser(payload.email);
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: payload.password });

      const token = await Token.findOne({ user: res.body.tokenUser.userId });
      // A SHA-256 hex digest is exactly 64 chars; the raw opaque secret (randomBytes(40)
      // hex-encoded) is 80 chars, so this also proves the raw value isn't what's stored.
      expect(token.refreshToken).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("GET /api/v1/auth/showCurrentUser", () => {
    it("rejects unauthenticated requests", async () => {
      const res = await request(app).get("/api/v1/auth/showCurrentUser");
      expect(res.statusCode).toBe(401);
    });

    it("returns the authenticated user", async () => {
      const { agent, user } = await registerVerifiedAgent(talentPayload());
      const res = await agent.get("/api/v1/auth/showCurrentUser");
      expect(res.statusCode).toBe(200);
      expect(res.body.user.userId).toBe(String(user._id));
    });
  });

  describe("PATCH /api/v1/auth/updateUser", () => {
    it("updates name/email and resets verification when the email changes", async () => {
      const { agent, user } = await registerVerifiedAgent(talentPayload());
      const newEmail = `changed-${Date.now()}@example.com`;
      const res = await agent
        .patch("/api/v1/auth/updateUser")
        .send({ name: "New Name", email: newEmail });
      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toMatch(/verify/i);

      const updated = await User.findById(user._id);
      expect(updated.email).toBe(newEmail);
      expect(updated.isVerified).toBe(false);
    });

    it("keeps verification status when email is unchanged", async () => {
      const { agent, user } = await registerVerifiedAgent(talentPayload());
      const res = await agent
        .patch("/api/v1/auth/updateUser")
        .send({ name: "New Name", email: user.email });
      expect(res.statusCode).toBe(200);
      const updated = await User.findById(user._id);
      expect(updated.isVerified).toBe(true);
    });
  });

  describe("PATCH /api/v1/auth/updateUserPassword", () => {
    it("rejects an incorrect old password", async () => {
      const { agent } = await registerVerifiedAgent(talentPayload());
      const res = await agent
        .patch("/api/v1/auth/updateUserPassword")
        .send({ oldPassword: "wrong", newPassword: "newpassword1" });
      expect(res.statusCode).toBe(401);
    });

    it("rejects when new password equals old password", async () => {
      const payload = talentPayload();
      const { agent } = await registerVerifiedAgent(payload);
      const res = await agent
        .patch("/api/v1/auth/updateUserPassword")
        .send({ oldPassword: payload.password, newPassword: payload.password });
      expect(res.statusCode).toBe(400);
    });

    it("updates the password and allows login with the new password", async () => {
      const payload = talentPayload();
      const { agent } = await registerVerifiedAgent(payload);
      const res = await agent
        .patch("/api/v1/auth/updateUserPassword")
        .send({ oldPassword: payload.password, newPassword: "newpassword1" });
      expect(res.statusCode).toBe(200);

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: "newpassword1" });
      expect(loginRes.statusCode).toBe(200);
    });
  });

  describe("POST /api/v1/auth/refresh-token", () => {
    it("rejects a request with no refresh token cookie", async () => {
      const res = await request(app).post("/api/v1/auth/refresh-token");
      expect(res.statusCode).toBe(401);
    });

    it("rotates the refresh token and rejects reuse of the old one", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      await verifyUser(payload.email);

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: payload.password });
      // Reduce each Set-Cookie header down to its "name=value" pair and join with
      // "; " - a real browser would send only this on the next request's Cookie header.
      const originalCookies = loginRes.headers["set-cookie"]
        .map((cookie) => cookie.split(";")[0])
        .join("; ");

      // First refresh with the original refresh token succeeds and rotates it server-side.
      const firstRefresh = await request(app)
        .post("/api/v1/auth/refresh-token")
        .set("Cookie", originalCookies);
      expect(firstRefresh.statusCode).toBe(200);
      expect(firstRefresh.headers["set-cookie"].join(";")).toMatch(/refreshToken=/);

      // Replaying the ORIGINAL (now-rotated-away) refresh token must be rejected.
      const replayRes = await request(app)
        .post("/api/v1/auth/refresh-token")
        .set("Cookie", originalCookies);
      expect(replayRes.statusCode).toBe(401);
    });

    it("rejects a garbage/invalid refresh token cookie", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh-token")
        .set("Cookie", ["refreshToken=not-a-real-token", "refreshTokenSecret=not-a-real-secret"]);
      expect(res.statusCode).toBe(401);
    });

    it("rejects a refresh request missing the opaque secret cookie", async () => {
      const payload = talentPayload();
      await registerUser(payload);
      await verifyUser(payload.email);
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: payload.password });

      // Keep only the refreshToken (identity JWT) cookie, drop refreshTokenSecret -
      // the identity JWT alone must never be sufficient to refresh a session.
      const refreshTokenCookie = loginRes.headers["set-cookie"]
        .map((cookie) => cookie.split(";")[0])
        .find((cookie) => cookie.startsWith("refreshToken="));

      const res = await request(app)
        .post("/api/v1/auth/refresh-token")
        .set("Cookie", refreshTokenCookie);
      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/v1/auth/logout", () => {
    it("revokes the refresh token server-side so it can no longer be used to refresh", async () => {
      const { agent } = await registerVerifiedAgent(talentPayload());
      await agent.get("/api/v1/auth/logout");
      const res = await agent.post("/api/v1/auth/refresh-token");
      expect(res.statusCode).toBe(401);
    });
  });
});
