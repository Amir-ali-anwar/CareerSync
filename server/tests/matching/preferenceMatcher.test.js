import preferenceMatcher from "../../services/matching/matchers/preferenceMatcher.js";

describe("preferenceMatcher", () => {
  it("scores 1 when remote preference matches a remote job", () => {
    const result = preferenceMatcher(
      { workModePreference: "remote", preferredLocations: [] },
      { workMode: "remote" }
    );
    expect(result.workMode.score).toBe(1);
    expect(result.score).toBe(1);
  });

  it("scores 0 for the work-mode sub-check when remote preference meets an on-site job", () => {
    const result = preferenceMatcher({ workModePreference: "remote" }, { workMode: "onsite" });
    expect(result.workMode.score).toBe(0);
    expect(result.score).toBe(0);
  });

  it("scores 1 for a compatible named location", () => {
    const result = preferenceMatcher(
      { preferredLocations: ["New York"] },
      { jobLocation: { city: "New York", country: "United States" } }
    );
    expect(result.location.score).toBe(1);
  });

  it("treats a 'Remote' location preference as compatible with any job location", () => {
    const result = preferenceMatcher(
      { preferredLocations: ["Remote"] },
      { jobLocation: { city: "Berlin", country: "Germany" } }
    );
    expect(result.location.score).toBe(1);
  });

  it("scores 0 for the location sub-check when the preferred location doesn't match", () => {
    const result = preferenceMatcher(
      { preferredLocations: ["Paris"] },
      { jobLocation: { city: "Berlin", country: "Germany" } }
    );
    expect(result.location.score).toBe(0);
  });

  it("is excluded (null) when the candidate has no work-mode preference ('any') and the job doesn't specify", () => {
    const result = preferenceMatcher({ workModePreference: "any" }, {});
    expect(result.workMode.score).toBeNull();
  });

  it("is excluded (null) when the candidate has no stated location preference", () => {
    const result = preferenceMatcher({ preferredLocations: [] }, { jobLocation: { city: "Berlin", country: "Germany" } });
    expect(result.location.score).toBeNull();
  });

  it("is excluded (null) overall when both sub-checks are excluded, not scored as a mismatch", () => {
    const result = preferenceMatcher({ workModePreference: "any", preferredLocations: [] }, {});
    expect(result.score).toBeNull();
  });

  it("averages both sub-checks when only one is a perfect match and the other is unknown", () => {
    // work mode matches perfectly, location has no stated preference (excluded) - overall
    // should equal just the work-mode score, not be diluted by a fabricated location score.
    const result = preferenceMatcher(
      { workModePreference: "remote", preferredLocations: [] },
      { workMode: "remote" }
    );
    expect(result.score).toBe(1);
  });

  it("handles a missing candidate profile without throwing", () => {
    const result = preferenceMatcher(null, { workMode: "remote", jobLocation: { city: "Berlin", country: "Germany" } });
    expect(result.score).toBeNull();
  });
});
