import {
  canonicalSkillName,
  normalizeSkillKey,
  normalizeSkillList,
  inferTitleAndSeniority,
  inferSeniorityFromYearsOfExperience,
} from "../utils/normalization.js";

describe("normalization utilities", () => {
  describe("canonicalSkillName / normalizeSkillKey", () => {
    it.each([
      ["ReactJS", "React"],
      ["react.js", "React"],
      ["React", "React"],
      ["NodeJS", "Node.js"],
      ["node.js", "Node.js"],
      ["Node", "Node.js"],
    ])("normalizes %s to the same canonical form as its aliases (%s)", (input, expected) => {
      expect(canonicalSkillName(input)).toBe(expected);
    });

    it("produces the same comparison key for every alias of the same skill", () => {
      expect(normalizeSkillKey("ReactJS")).toBe(normalizeSkillKey("React.js"));
      expect(normalizeSkillKey("ReactJS")).toBe(normalizeSkillKey("React"));
    });

    it("falls back to the trimmed original for an unknown skill", () => {
      expect(canonicalSkillName("  SomeObscureFramework  ")).toBe("SomeObscureFramework");
    });
  });

  describe("normalizeSkillList", () => {
    it("dedupes aliases of the same skill into one canonical entry", () => {
      expect(normalizeSkillList(["ReactJS", "React.js", "React"])).toEqual(["React"]);
    });

    it("preserves distinct skills", () => {
      const result = normalizeSkillList(["React", "Node", "Docker"]);
      expect(result).toEqual(expect.arrayContaining(["React", "Node.js", "Docker"]));
      expect(result).toHaveLength(3);
    });
  });

  describe("inferTitleAndSeniority", () => {
    it("extracts 'senior' from a title and strips it from the normalized form", () => {
      const { normalizedTitle, seniority } = inferTitleAndSeniority("Senior Software Engineer");
      expect(seniority).toBe("senior");
      expect(normalizedTitle).toBe("software engineer");
    });

    it("normalizes an abbreviated seniority qualifier to the same result", () => {
      const a = inferTitleAndSeniority("Senior Software Engineer");
      const b = inferTitleAndSeniority("Sr Software Engineer");
      expect(a.normalizedTitle).toBe(b.normalizedTitle);
      expect(a.seniority).toBe(b.seniority);
    });

    it("recognizes lead/principal/staff as 'lead'", () => {
      expect(inferTitleAndSeniority("Principal Engineer").seniority).toBe("lead");
      expect(inferTitleAndSeniority("Staff Engineer").seniority).toBe("lead");
      expect(inferTitleAndSeniority("Lead Engineer").seniority).toBe("lead");
    });

    it("recognizes junior/entry-level as 'entry'", () => {
      expect(inferTitleAndSeniority("Junior Developer").seniority).toBe("entry");
      expect(inferTitleAndSeniority("Entry-Level Developer").seniority).toBe("entry");
    });

    it("returns null seniority (not a guessed default) when there's no signal", () => {
      const { seniority, normalizedTitle } = inferTitleAndSeniority("Software Engineer");
      expect(seniority).toBeNull();
      expect(normalizedTitle).toBe("software engineer");
    });

    it("handles an empty/undefined title without throwing", () => {
      expect(inferTitleAndSeniority("").normalizedTitle).toBeNull();
      expect(inferTitleAndSeniority().normalizedTitle).toBeNull();
    });
  });

  describe("inferSeniorityFromYearsOfExperience", () => {
    it.each([
      [0, "entry"],
      [1, "entry"],
      [2, "mid"],
      [4, "mid"],
      [5, "senior"],
      [8, "senior"],
      [9, "lead"],
      [20, "lead"],
    ])("maps %s years to %s", (years, expected) => {
      expect(inferSeniorityFromYearsOfExperience(years)).toBe(expected);
    });

    it("returns null (not a guessed default) for null/undefined years", () => {
      expect(inferSeniorityFromYearsOfExperience(null)).toBeNull();
      expect(inferSeniorityFromYearsOfExperience(undefined)).toBeNull();
    });
  });
});
