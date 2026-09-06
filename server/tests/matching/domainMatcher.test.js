import domainMatcher from "../../services/matching/matchers/domainMatcher.js";

describe("domainMatcher", () => {
  it("scores 1 for full domain overlap", () => {
    const result = domainMatcher({ domains: ["Fintech", "SaaS"] }, {}, { domains: ["Fintech", "SaaS"] });
    expect(result.score).toBe(1);
    expect(result.matched).toEqual(["Fintech", "SaaS"]);
  });

  it("scores partial overlap proportionally against the job's domains", () => {
    const result = domainMatcher({ domains: ["Fintech", "AI"] }, {}, { domains: ["Fintech", "Cloud", "SaaS"] });
    expect(result.score).toBeCloseTo(1 / 3);
    expect(result.matched).toEqual(["Fintech"]);
  });

  it("scores 0 for no overlap without disqualifying the candidate outright", () => {
    const result = domainMatcher({ domains: ["Gaming"] }, {}, { domains: ["Fintech"] });
    expect(result.score).toBe(0);
  });

  it("is excluded (null) when the candidate has no domain data", () => {
    const result = domainMatcher({ domains: [] }, {}, { domains: ["Fintech"] });
    expect(result.score).toBeNull();
  });

  it("is excluded (null) when the job profile has no domain data", () => {
    const result = domainMatcher({ domains: ["Fintech"] }, {}, { domains: [] });
    expect(result.score).toBeNull();
  });

  it("is excluded (null) when there is no JobProfile at all", () => {
    const result = domainMatcher({ domains: ["Fintech"] }, {}, null);
    expect(result.score).toBeNull();
  });

  it("compares domains case-insensitively", () => {
    const result = domainMatcher({ domains: ["fintech"] }, {}, { domains: ["FinTech"] });
    expect(result.score).toBe(1);
  });
});
