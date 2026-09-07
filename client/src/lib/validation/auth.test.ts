import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, resetPasswordSchema } from "./auth";

describe("loginSchema", () => {
  it("accepts a valid email/password pair", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

const baseTalent = {
  role: "talent" as const,
  name: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  password: "password123",
  confirmPassword: "password123",
  phone: "+14155552671",
  country: "US",
  city: "New York",
};

describe("registerSchema", () => {
  it("accepts a valid talent registration", () => {
    const result = registerSchema.safeParse(baseTalent);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid phone number", () => {
    const result = registerSchema.safeParse({ ...baseTalent, phone: "+15551234567" });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({ ...baseTalent, confirmPassword: "different" });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters (matches backend minlength)", () => {
    const result = registerSchema.safeParse({ ...baseTalent, password: "ab1", confirmPassword: "ab1" });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no digit (matches backend policy)", () => {
    const result = registerSchema.safeParse({
      ...baseTalent,
      password: "onlyletters",
      confirmPassword: "onlyletters",
    });
    expect(result.success).toBe(false);
  });

  it("requires companyName/companySize/industry when role is employer", () => {
    const result = registerSchema.safeParse({ ...baseTalent, role: "employer" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toEqual(expect.arrayContaining(["companyName", "companySize", "industry"]));
    }
  });

  it("accepts a valid employer registration with company fields", () => {
    const result = registerSchema.safeParse({
      ...baseTalent,
      role: "employer",
      companyName: "Tech Corp",
      companySize: "51-200",
      industry: "Technology",
    });
    expect(result.success).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  const baseReset = {
    email: "jane@example.com",
    otp: "123456",
    newPassword: "newpassword123",
    confirmNewPassword: "newpassword123",
  };

  it("accepts a valid reset payload", () => {
    const result = resetPasswordSchema.safeParse(baseReset);
    expect(result.success).toBe(true);
  });

  it("rejects a code that isn't 6 digits", () => {
    const result = resetPasswordSchema.safeParse({ ...baseReset, otp: "12345" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric code", () => {
    const result = resetPasswordSchema.safeParse({ ...baseReset, otp: "abcdef" });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched new passwords", () => {
    const result = resetPasswordSchema.safeParse({ ...baseReset, confirmNewPassword: "different123" });
    expect(result.success).toBe(false);
  });
});
