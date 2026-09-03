import seniorityMatcher from "../../services/matching/matchers/seniorityMatcher.js";

describe("seniorityMatcher", () => {
  it("scores 1 for an exact seniority match (both derive to 'senior')", () => {
    // 6 years -> "senior" per inferSeniorityFromYearsOfExperience's thresholds.
    const result = seniorityMatcher({ yearsOfExperience: 6 }, {}, { seniority: "senior" });
    expect(result.score).toBe(1);
    expect(result.candidateSeniority).toBe("senior");
    expect(result.jobSeniority).toBe("senior");
  });

  it("scores highly (but not perfectly) for adjacent compatible levels", () => {
    // 4 years -> "mid", job wants "senior" - adjacent on the 4-level ladder.
    const result = seniorityMatcher({ yearsOfExperience: 4 }, {}, { seniority: "senior" });
    expect(result.distance).toBe(1);
    expect(result.score).toBeCloseTo(2 / 3);
  });

  it("scores 0 for a maximally distant mismatch (entry vs lead)", () => {
    // 1 year -> "entry", job wants "lead" - opposite ends of the ladder.
    const result = seniorityMatcher({ yearsOfExperience: 1 }, {}, { seniority: "lead" });
    expect(result.distance).toBe(3);
    expect(result.score).toBe(0);
  });

  it("is excluded (null) when the job has no seniority signal (no JobProfile)", () => {
    const result = seniorityMatcher({ yearsOfExperience: 6 }, {}, null);
    expect(result.score).toBeNull();
    expect(result.jobSeniority).toBeNull();
  });

  it("is excluded (null) when the candidate has no experience to infer seniority from", () => {
    const result = seniorityMatcher({ yearsOfExperience: null }, {}, { seniority: "senior" });
    expect(result.score).toBeNull();
    expect(result.candidateSeniority).toBeNull();
  });

  it("handles a missing candidate profile without throwing", () => {
    const result = seniorityMatcher(null, {}, { seniority: "senior" });
    expect(result.score).toBeNull();
  });
});
