import { describe, expect, it } from "vitest";
import type { AxiosError } from "axios";
import { normalizeError } from "./client";
import { ApiError } from "@/types/api";
import type { ApiErrorPayload } from "@/types/api";

function makeAxiosError(overrides: Partial<AxiosError<ApiErrorPayload>>): AxiosError<ApiErrorPayload> {
  return {
    isAxiosError: true,
    name: "AxiosError",
    message: "Request failed",
    toJSON: () => ({}),
    ...overrides,
  } as AxiosError<ApiErrorPayload>;
}

describe("normalizeError", () => {
  it("surfaces the backend's msg for a 4xx response", () => {
    const error = makeAxiosError({
      response: {
        status: 400,
        data: { msg: "Email already exists" },
        statusText: "Bad Request",
        headers: {},
        config: {} as never,
      },
    });

    const result = normalizeError(error);
    expect(result).toBeInstanceOf(ApiError);
    expect(result.status).toBe(400);
    expect(result.message).toBe("Email already exists");
  });

  it("replaces a 5xx response with a generic, user-friendly message", () => {
    const error = makeAxiosError({
      response: {
        status: 500,
        data: { msg: "TypeError: cannot read property x of undefined at internal/module.js:42" },
        statusText: "Internal Server Error",
        headers: {},
        config: {} as never,
      },
    });

    const result = normalizeError(error);
    expect(result.status).toBe(500);
    expect(result.message).toBe("Something went wrong. Please try again.");
  });

  it("reports an unreachable-server message when there is no response at all", () => {
    const error = makeAxiosError({ request: {} });
    const result = normalizeError(error);
    expect(result.status).toBe(0);
    expect(result.message).toMatch(/unable to reach the server/i);
  });
});
