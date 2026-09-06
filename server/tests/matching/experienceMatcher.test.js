import experienceMatcher from "../../services/matching/matchers/experienceMatcher.js";

describe("experienceMatcher", () => {
  it("scores 1 and status 'exceeds' when the candidate exceeds the requirement", () => {
    const result = experienceMatcher({ yearsOfExperience: 6 }, { requiredExperience: 3 });
    expect(result.score).toBe(1);
    expect(result.status).toBe("exceeds");
  });

  it("scores 1 and status 'meets' when the candidate exactly meets the requirement", () => {
    const result = experienceMatcher({ yearsOfExperience: 5 }, { requiredExperience: 5 });
    expect(result.score).toBe(1);
    expect(result.status).toBe("meets");
  });

  it("scores less than 1 and status 'slightly_below' for a small shortfall", () => {
    const result = experienceMatcher({ yearsOfExperience: 4 }, { requiredExperience: 5 });
    expect(result.score).toBeCloseTo(0.8);
    expect(result.status).toBe("slightly_below");
  });

  it("scores much less than 1 and status 'significantly_below' for a large shortfall", () => {
    const result = experienceMatcher({ yearsOfExperience: 2 }, { requiredExperience: 5 });
    expect(result.score).toBeCloseTo(0.4);
    expect(result.status).toBe("significantly_below");
  });

  it("treats missing candidate experience as unknown (excluded), never as zero", () => {
    const result = experienceMatcher({ yearsOfExperience: null }, { requiredExperience: 5 });
    expect(result.score).toBeNull();
    expect(result.status).toBe("unknown");
  });

  it("treats a job with no stated experience requirement as trivially satisfied", () => {
    const result = experienceMatcher({ yearsOfExperience: 1 }, {});
    expect(result.score).toBe(1);
    expect(result.status).toBe("not_required");
  });

  it("handles a missing candidate profile without throwing", () => {
    const result = experienceMatcher(null, { requiredExperience: 3 });
    expect(result.score).toBeNull();
    expect(result.status).toBe("unknown");
  });
});
