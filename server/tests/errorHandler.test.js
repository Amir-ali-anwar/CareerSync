import request from "supertest";
import { app } from "./helpers.js";

describe("Error responses carry a correlation id", () => {
  it("includes a requestId in the JSON body matching the X-Request-Id header", async () => {
    const res = await request(app).get("/api/v1/jobs/not-a-valid-id");
    expect(res.statusCode).toBe(401); // unauthenticated - still goes through the error handler
    expect(typeof res.body.requestId).toBe("string");
    expect(res.body.requestId.length).toBeGreaterThan(0);
    expect(res.headers["x-request-id"]).toBe(res.body.requestId);
  });
});
