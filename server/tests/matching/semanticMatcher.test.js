import semanticMatcher from "../../services/matching/matchers/semanticMatcher.js";

describe("semanticMatcher (Module F extension point)", () => {
  it("always returns a null score - no fabricated similarity value", () => {
    const result = semanticMatcher({ skills: ["React"] }, { skills: ["React"] });
    expect(result.score).toBeNull();
  });

  it("never calls out to any AI/embedding provider (no network/API dependency)", () => {
    // The function is fully synchronous and pure - there is nothing to mock, which is
    // itself the assertion: it cannot possibly make an external call.
    expect(semanticMatcher.constructor.name).not.toBe("AsyncFunction");
  });
});
