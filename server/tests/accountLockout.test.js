import request from "supertest";
import { app, talentPayload, registerUser, verifyUser } from "./helpers.js";
import User from "../models/User.js";

const registerAndVerify = async (overrides = {}) => {
  const payload = talentPayload(overrides);
  await registerUser(payload);
  await verifyUser(payload.email);
  return payload;
};

describe("Account lockout", () => {
  it("locks the account after 5 failed login attempts", async () => {
    const payload = await registerAndVerify();

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: "wrong-password" });
      expect(res.statusCode).toBe(401);
    }

    const user = await User.findOne({ email: payload.email });
    expect(user.lockUntil).toBeTruthy();
    expect(user.failedLoginAttempts).toBe(0);

    // Even the CORRECT password is rejected while locked.
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: payload.email, password: payload.password });
    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toMatch(/locked/i);
  });

  it("does not lock the account before the threshold, and resets the counter on success", async () => {
    const payload = await registerAndVerify();

    for (let i = 0; i < 3; i += 1) {
      await request(app)
        .post("/api/v1/auth/login")
        .send({ email: payload.email, password: "wrong-password" });
    }

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: payload.email, password: payload.password });
    expect(res.statusCode).toBe(200);

    const user = await User.findOne({ email: payload.email });
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockUntil).toBeFalsy();
  });

  it("allows login again once the lock has expired", async () => {
    const payload = await registerAndVerify();
    await User.findOneAndUpdate(
      { email: payload.email },
      { lockUntil: new Date(Date.now() - 1000), failedLoginAttempts: 0 }
    );

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: payload.email, password: payload.password });
    expect(res.statusCode).toBe(200);
  });
});
