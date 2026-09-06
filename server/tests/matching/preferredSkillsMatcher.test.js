import preferredSkillsMatcher from "../../services/matching/matchers/preferredSkillsMatcher.js";

describe("preferredSkillsMatcher", () => {
  it("scores 1 when all preferred skills are matched", () => {
    const result = preferredSkillsMatcher({ skills: ["Next.js", "AWS"] }, { preferredSkills: ["Next.js", "AWS"] });
    expect(result.score).toBe(1);
  });

  it("scores partial match proportionally", () => {
    const result = preferredSkillsMatcher({ skills: ["Next.js"] }, { preferredSkills: ["Next.js", "AWS", "Docker"] });
    expect(result.score).toBeCloseTo(1 / 3);
    expect(result.matched).toEqual(["Next.js"]);
    expect(result.missing).toEqual(["AWS", "Docker"]);
  });

  it("scores 0 when no preferred skills are matched", () => {
    const result = preferredSkillsMatcher({ skills: ["Python"] }, { preferredSkills: ["Next.js", "AWS"] });
    expect(result.score).toBe(0);
  });

  it("scores 1 when the job lists no preferred skills at all", () => {
    const result = preferredSkillsMatcher({ skills: [] }, { preferredSkills: [] });
    expect(result.score).toBe(1);
  });

  it("a candidate with all required skills but none of the preferred skills is still a strong overall contributor here for preferred alone (0)", () => {
    // This test documents the matcher's own local behavior; the "should still be a
    // strong OVERALL match" guarantee is an aggregation-level property, verified in
    // scoreAggregator.test.js, not something this single matcher decides.
    const result = preferredSkillsMatcher({ skills: ["React", "TypeScript"] }, { preferredSkills: ["Next.js", "AWS", "Docker"] });
    expect(result.score).toBe(0);
  });
});
