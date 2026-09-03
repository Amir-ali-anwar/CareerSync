import { createJWT, isTokenValid } from "../utils/jwt.js";

describe("Access/refresh JWT secret separation", () => {
  const accessJWT = () =>
    createJWT({ payload: { user: { userId: "u1" } }, expiresIn: "15m", secret: process.env.JWT_SECRET });
  const refreshJWT = () =>
    createJWT({ payload: { userId: "u1" }, expiresIn: "30d", secret: process.env.JWT_REFRESH_SECRET });

  it("verifies an access JWT with JWT_SECRET", () => {
    const payload = isTokenValid(accessJWT(), process.env.JWT_SECRET);
    expect(payload.user.userId).toBe("u1");
  });

  it("verifies a refresh JWT with JWT_REFRESH_SECRET", () => {
    const payload = isTokenValid(refreshJWT(), process.env.JWT_REFRESH_SECRET);
    expect(payload.userId).toBe("u1");
  });

  it("rejects an access JWT when verified against JWT_REFRESH_SECRET", () => {
    expect(() => isTokenValid(accessJWT(), process.env.JWT_REFRESH_SECRET)).toThrow();
  });

  it("rejects a refresh JWT when verified against JWT_SECRET", () => {
    expect(() => isTokenValid(refreshJWT(), process.env.JWT_SECRET)).toThrow();
  });
});
