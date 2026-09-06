import express from "express";
import request from "supertest";
import rateLimit from "express-rate-limit";

// The app-wide limiters all `skip` during NODE_ENV=test (see middlewares/rateLimiter.js)
// so the real test suite can run without hitting 429s. This exercises the exact same
// express-rate-limit configuration shape in isolation, with skip disabled, to prove the
// limiting behavior itself actually works.
describe("Rate limiting behavior", () => {
  it("allows requests under the configured max", async () => {
    const app = express();
    app.use(
      rateLimit({
        windowMs: 60 * 1000,
        max: 3,
        standardHeaders: true,
        legacyHeaders: false,
        message: { msg: "Too many requests." },
      })
    );
    app.get("/ping", (req, res) => res.status(200).json({ ok: true }));

    const res = await request(app).get("/ping");
    expect(res.statusCode).toBe(200);
  });

  it("blocks requests once the configured max is exceeded, with a 429 and a clear message", async () => {
    const app = express();
    app.use(
      rateLimit({
        windowMs: 60 * 1000,
        max: 3,
        standardHeaders: true,
        legacyHeaders: false,
        message: { msg: "Too many requests." },
      })
    );
    app.get("/ping", (req, res) => res.status(200).json({ ok: true }));

    for (let i = 0; i < 3; i++) {
      const res = await request(app).get("/ping");
      expect(res.statusCode).toBe(200);
    }

    const blocked = await request(app).get("/ping");
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body.msg).toMatch(/too many/i);
  });
});
