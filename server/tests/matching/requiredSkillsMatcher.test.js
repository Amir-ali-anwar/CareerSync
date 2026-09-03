import requiredSkillsMatcher from "../../services/matching/matchers/requiredSkillsMatcher.js";

describe("requiredSkillsMatcher", () => {
  it("scores 1 for a 100% required skill match", () => {
    const result = requiredSkillsMatcher(
      { skills: ["React", "TypeScript", "Node.js"] },
      { requiredSkills: ["React", "TypeScript", "Node.js"] }
    );
    expect(result.score).toBe(1);
    expect(result.matched).toEqual(["React", "TypeScript", "Node.js"]);
    expect(result.missing).toEqual([]);
  });

  it("scores partial match proportionally", () => {
    const result = requiredSkillsMatcher(
      { skills: ["React", "TypeScript"] },
      { requiredSkills: ["React", "TypeScript", "Node.js", "PostgreSQL"] }
    );
    expect(result.score).toBe(0.5);
    expect(result.matched).toEqual(["React", "TypeScript"]);
    expect(result.missing).toEqual(["Node.js", "PostgreSQL"]);
  });

  it("scores 0 for no required skill match", () => {
    const result = requiredSkillsMatcher({ skills: ["Python"] }, { requiredSkills: ["React", "Vue"] });
    expect(result.score).toBe(0);
    expect(result.missing).toEqual(["React", "Vue"]);
  });

  it("identifies exactly one missing critical skill", () => {
    const result = requiredSkillsMatcher(
      { skills: ["React", "TypeScript", "Node.js", "MongoDB"] },
      { requiredSkills: ["React", "TypeScript", "Node.js", "MongoDB", "Docker"] }
    );
    expect(result.missing).toEqual(["Docker"]);
    expect(result.score).toBeCloseTo(0.8);
  });

  it("scores 1 when the job has no required skills at all (nothing unmet)", () => {
    const result = requiredSkillsMatcher({ skills: [] }, { requiredSkills: [] });
    expect(result.score).toBe(1);
  });

  it("scores 1 when requiredSkills is undefined on the job", () => {
    const result = requiredSkillsMatcher({ skills: ["React"] }, {});
    expect(result.score).toBe(1);
  });

  it("does not double-count duplicate skills", () => {
    const result = requiredSkillsMatcher(
      { skills: ["React", "React", "TypeScript"] },
      { requiredSkills: ["React", "React", "TypeScript"] }
    );
    // normalizeSkillList already dedupes the required list itself
    expect(result.score).toBe(1);
    expect(result.matched).toEqual(["React", "TypeScript"]);
  });

  it("matches skill aliases (ReactJS === React === React.js)", () => {
    const result = requiredSkillsMatcher({ skills: ["ReactJS", "node"] }, { requiredSkills: ["React.js", "Node.js"] });
    expect(result.score).toBe(1);
  });

  it("matches regardless of case differences", () => {
    const result = requiredSkillsMatcher({ skills: ["react", "TYPESCRIPT"] }, { requiredSkills: ["React", "TypeScript"] });
    expect(result.score).toBe(1);
  });

  it("handles a missing candidate profile (no skills) without throwing", () => {
    const result = requiredSkillsMatcher(null, { requiredSkills: ["React"] });
    expect(result.score).toBe(0);
    expect(result.missing).toEqual(["React"]);
  });
});
