import request from "supertest";
import mongoose from "mongoose";
import { app } from "./helpers.js";

describe("Health & readiness endpoints", () => {
  describe("GET /healthz", () => {
    it("always returns 200 ok without depending on the database", async () => {
      const res = await request(app).get("/healthz");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });
  });

  describe("GET /readyz", () => {
    it("returns 200 ok when MongoDB is connected", async () => {
      expect(mongoose.connection.readyState).toBe(1);
      const res = await request(app).get("/readyz");
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("ok");
    });

    it("returns 503 when MongoDB is not connected", async () => {
      // Simulate a disconnected state via the reported readyState only - this never
      // touches the real socket, so cleanup between tests keeps working normally.
      const originalState = mongoose.connection.readyState;
      mongoose.connection.readyState = 0;
      try {
        const res = await request(app).get("/readyz");
        expect(res.statusCode).toBe(503);
        expect(res.body.status).toBe("error");
      } finally {
        mongoose.connection.readyState = originalState;
      }
    });
  });
});
