import request from "supertest";
import { authenticator } from "otplib";
import { app, talentPayload, registerVerifiedAgent, validLocation } from "./helpers.js";
import User from "../models/User.js";
import verifyGoogleIdToken from "../utils/googleAuth.js";

const googlePayload = (overrides = {}) => ({
  sub: `google-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  email: `googleuser-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
  email_verified: true,
  given_name: "Google",
  family_name: "User",
  ...overrides,
});

describe("Google sign-in", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/v1/auth/google", () => {
    it("rejects an invalid Google token", async () => {
      verifyGoogleIdToken.mockRejectedValueOnce(new Error("invalid token"));
      const res = await request(app).post("/api/v1/auth/google").send({ idToken: "bad" });
      expect(res.statusCode).toBe(401);
    });

    it("responds needsOnboarding for a brand-new Google identity", async () => {
      const profile = googlePayload();
      verifyGoogleIdToken.mockResolvedValueOnce(profile);

      const res = await request(app).post("/api/v1/auth/google").send({ idToken: "good" });
      expect(res.statusCode).toBe(200);
      expect(res.body.needsOnboarding).toBe(true);
      expect(res.body.pendingToken).toBeTruthy();
      expect(res.body.profile.email).toBe(profile.email);
    });

    it("rejects a brand-new Google identity whose email isn't verified", async () => {
      verifyGoogleIdToken.mockResolvedValueOnce(googlePayload({ email_verified: false }));
      const res = await request(app).post("/api/v1/auth/google").send({ idToken: "good" });
      expect(res.statusCode).toBe(401);
    });

    it("links googleId onto an existing password account with a matching verified email and logs in", async () => {
      const payload = talentPayload();
      const { user } = await registerVerifiedAgent(payload);
      const profile = googlePayload({ email: payload.email });
      verifyGoogleIdToken.mockResolvedValueOnce(profile);

      const res = await request(app).post("/api/v1/auth/google").send({ idToken: "good" });
      expect(res.statusCode).toBe(200);
      expect(res.body.tokenUser).toBeTruthy();
      expect(res.headers["set-cookie"].join(";")).toMatch(/accessToken=/);

      const updated = await User.findById(user._id);
      expect(updated.googleId).toBe(profile.sub);
    });

    it("rejects linking when Google hasn't verified the matching email", async () => {
      const payload = talentPayload();
      await registerVerifiedAgent(payload);
      verifyGoogleIdToken.mockResolvedValueOnce(
        googlePayload({ email: payload.email, email_verified: false })
      );

      const res = await request(app).post("/api/v1/auth/google").send({ idToken: "good" });
      expect(res.statusCode).toBe(401);
    });

    it("logs a known Google-linked account straight in on a later sign-in", async () => {
      const profile = googlePayload();
      verifyGoogleIdToken.mockResolvedValueOnce(profile);
      const onboardRes = await request(app).post("/api/v1/auth/google").send({ idToken: "good" });
      await request(app).post("/api/v1/auth/google/complete").send({
        pendingToken: onboardRes.body.pendingToken,
        role: "talent",
        phone: "+14155552671",
        location: validLocation,
      });

      verifyGoogleIdToken.mockResolvedValueOnce(profile);
      const res = await request(app).post("/api/v1/auth/google").send({ idToken: "good-again" });
      expect(res.statusCode).toBe(200);
      expect(res.body.tokenUser).toBeTruthy();
    });

    it("gates a 2FA-enabled Google-linked account through requiresTwoFactor", async () => {
      const profile = googlePayload();
      verifyGoogleIdToken.mockResolvedValueOnce(profile);
      const onboardRes = await request(app).post("/api/v1/auth/google").send({ idToken: "good" });
      const completeRes = await request(app).post("/api/v1/auth/google/complete").send({
        pendingToken: onboardRes.body.pendingToken,
        role: "talent",
        phone: "+14155552671",
        location: validLocation,
      });

      const user = await User.findById(completeRes.body.tokenUser.userId);
      user.twoFactorEnabled = true;
      user.twoFactorSecret = "JBSWY3DPEHPK3PXP";
      await user.save({ validateBeforeSave: false });

      verifyGoogleIdToken.mockResolvedValueOnce(profile);
      const res = await request(app).post("/api/v1/auth/google").send({ idToken: "good-again" });
      expect(res.statusCode).toBe(200);
      expect(res.body.requiresTwoFactor).toBe(true);
      expect(res.body.tempToken).toBeTruthy();

      const token = authenticator.generate(user.twoFactorSecret);
      const twoFaRes = await request(app)
        .post("/api/v1/auth/2fa/login")
        .send({ tempToken: res.body.tempToken, token });
      expect(twoFaRes.statusCode).toBe(200);
    });
  });

  describe("POST /api/v1/auth/google/complete", () => {
    it("creates a fully-formed, pre-verified, no-password account and logs in", async () => {
      const profile = googlePayload();
      verifyGoogleIdToken.mockResolvedValueOnce(profile);
      const onboardRes = await request(app).post("/api/v1/auth/google").send({ idToken: "good" });

      const res = await request(app).post("/api/v1/auth/google/complete").send({
        pendingToken: onboardRes.body.pendingToken,
        role: "talent",
        phone: "+14155552671",
        location: validLocation,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.tokenUser).toBeTruthy();

      const user = await User.findOne({ email: profile.email }).select("+password");
      expect(user.isVerified).toBe(true);
      expect(user.authProvider).toBe("google");
      expect(user.password).toBeUndefined();
    });

    it("rejects a missing/expired pendingToken", async () => {
      const res = await request(app).post("/api/v1/auth/google/complete").send({
        pendingToken: "not-a-real-token",
        role: "talent",
        phone: "+14155552671",
        location: validLocation,
      });
      expect(res.statusCode).toBe(401);
    });

    it("rejects missing required fields", async () => {
      const profile = googlePayload();
      verifyGoogleIdToken.mockResolvedValueOnce(profile);
      const onboardRes = await request(app).post("/api/v1/auth/google").send({ idToken: "good" });

      const res = await request(app)
        .post("/api/v1/auth/google/complete")
        .send({ pendingToken: onboardRes.body.pendingToken, role: "talent" });
      expect(res.statusCode).toBe(400);
    });
  });
});
