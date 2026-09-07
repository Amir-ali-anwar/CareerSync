import request from "supertest";
import { app, talentPayload, registerUser, verifyUser } from "./helpers.js";
import User from "../models/User.js";
import Token from "../models/Token.js";
import sendPasswordResetEmail from "../utils/sendPasswordResetEmail.js";

const registerAndVerify = async (overrides = {}) => {
  const payload = talentPayload(overrides);
  await registerUser(payload);
  await verifyUser(payload.email);
  return payload;
};

describe("Password reset", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("responds 200 with a generic message for an existing account and sets a reset code", async () => {
      const payload = await registerAndVerify();

      const res = await request(app).post("/api/v1/auth/forgot-password").send({ email: payload.email });

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toMatch(/if an account exists/i);

      const user = await User.findOne({ email: payload.email });
      expect(user.passwordResetToken).toBeTruthy();
      expect(user.passwordResetTokenExpires).toBeTruthy();
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it("responds 200 with the same generic message for a nonexistent email (no user enumeration)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "nobody@example.com" });

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toMatch(/if an account exists/i);
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("rejects a missing email", async () => {
      const res = await request(app).post("/api/v1/auth/forgot-password").send({});
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /api/v1/auth/reset-password", () => {
    it("resets the password with a valid code and allows login with the new password", async () => {
      const payload = await registerAndVerify();
      await request(app).post("/api/v1/auth/forgot-password").send({ email: payload.email });
      const user = await User.findOne({ email: payload.email });

      const res = await request(app).post("/api/v1/auth/reset-password").send({
        email: payload.email,
        otp: user.passwordResetToken,
        newPassword: "newpassword456",
      });

      expect(res.statusCode).toBe(200);

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: "newpassword456" });
      expect(loginRes.statusCode).toBe(200);

      const oldLoginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: payload.password });
      expect(oldLoginRes.statusCode).toBe(401);
    });

    it("clears the reset code so it cannot be reused", async () => {
      const payload = await registerAndVerify();
      await request(app).post("/api/v1/auth/forgot-password").send({ email: payload.email });
      const user = await User.findOne({ email: payload.email });
      const otp = user.passwordResetToken;

      await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ email: payload.email, otp, newPassword: "newpassword456" });

      const second = await request(app)
        .post("/api/v1/auth/reset-password")
        .send({ email: payload.email, otp, newPassword: "anotherpassword789" });

      expect(second.statusCode).toBe(401);
    });

    it("rejects an incorrect reset code", async () => {
      const payload = await registerAndVerify();
      await request(app).post("/api/v1/auth/forgot-password").send({ email: payload.email });

      const res = await request(app).post("/api/v1/auth/reset-password").send({
        email: payload.email,
        otp: "000000",
        newPassword: "newpassword456",
      });

      expect(res.statusCode).toBe(401);
    });

    it("locks out after too many incorrect attempts, forcing a resend", async () => {
      const payload = await registerAndVerify();
      await request(app).post("/api/v1/auth/forgot-password").send({ email: payload.email });

      for (let i = 0; i < 5; i += 1) {
        await request(app).post("/api/v1/auth/reset-password").send({
          email: payload.email,
          otp: "000000",
          newPassword: "newpassword456",
        });
      }

      const user = await User.findOne({ email: payload.email });
      const res = await request(app).post("/api/v1/auth/reset-password").send({
        email: payload.email,
        otp: user.passwordResetToken,
        newPassword: "newpassword456",
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.msg).toMatch(/too many/i);
    });

    it("rejects an expired reset code", async () => {
      const payload = await registerAndVerify();
      await request(app).post("/api/v1/auth/forgot-password").send({ email: payload.email });
      const user = await User.findOne({ email: payload.email });
      user.passwordResetTokenExpires = new Date(Date.now() - 1000);
      await user.save({ validateBeforeSave: false });

      const res = await request(app).post("/api/v1/auth/reset-password").send({
        email: payload.email,
        otp: user.passwordResetToken,
        newPassword: "newpassword456",
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.msg).toMatch(/expired/i);
    });

    it("invalidates the user's existing refresh session after a reset", async () => {
      const payload = await registerAndVerify();
      await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: payload.password });

      const user = await User.findOne({ email: payload.email });
      await Token.create({ user: user._id, refreshToken: "some-hash", ip: "127.0.0.1", userAgent: "jest", isValid: true });

      await request(app).post("/api/v1/auth/forgot-password").send({ email: payload.email });
      const withToken = await User.findOne({ email: payload.email });
      await request(app).post("/api/v1/auth/reset-password").send({
        email: payload.email,
        otp: withToken.passwordResetToken,
        newPassword: "newpassword456",
      });

      const tokens = await Token.find({ user: user._id });
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.every((t) => t.isValid === false)).toBe(true);
    });

    it("rejects missing fields", async () => {
      const res = await request(app).post("/api/v1/auth/reset-password").send({ email: "a@b.com" });
      expect(res.statusCode).toBe(400);
    });
  });
});
