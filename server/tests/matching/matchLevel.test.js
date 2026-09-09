import { classifyMatchLevel, MATCH_LEVELS } from "../../services/matching/matchLevel.js";

describe("classifyMatchLevel", () => {
  it("classifies scores at every tier and boundary correctly", () => {
    expect(classifyMatchLevel(100).level).toBe("excellent_match");
    expect(classifyMatchLevel(90).level).toBe("excellent_match");
    expect(classifyMatchLevel(89).level).toBe("strong_match");
    expect(classifyMatchLevel(75).level).toBe("strong_match");
    expect(classifyMatchLevel(74).level).toBe("moderate_match");
    expect(classifyMatchLevel(60).level).toBe("moderate_match");
    expect(classifyMatchLevel(59).level).toBe("weak_match");
    expect(classifyMatchLevel(40).level).toBe("weak_match");
    expect(classifyMatchLevel(39).level).toBe("poor_match");
    expect(classifyMatchLevel(0).level).toBe("poor_match");
  });

  it("returns a human-readable label alongside the level", () => {
    expect(classifyMatchLevel(95)).toMatchObject({ level: "excellent_match", label: "Excellent Match" });
    expect(classifyMatchLevel(80)).toMatchObject({ level: "strong_match", label: "Strong Match" });
    expect(classifyMatchLevel(65)).toMatchObject({ level: "moderate_match", label: "Moderate Match" });
    expect(classifyMatchLevel(45)).toMatchObject({ level: "weak_match", label: "Weak Match" });
    expect(classifyMatchLevel(10)).toMatchObject({ level: "poor_match", label: "Poor Match" });
  });

  it("covers the full 0-100 range with no gaps between tiers", () => {
    const sorted = [...MATCH_LEVELS].sort((a, b) => a.minScore - b.minScore);
    expect(sorted[0].minScore).toBe(0);
    expect(sorted[sorted.length - 1].maxScore).toBe(100);
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].maxScore + 1).toBe(sorted[i + 1].minScore);
    }
  });
});
