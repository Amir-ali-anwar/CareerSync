import semanticMatcher from "../services/matching/matchers/semanticMatcher.js";
import { calculateMatch } from "../services/matching/matchingService.js";

describe("semantic matcher", () => {
  it("uses bounded vector similarity and gracefully excludes unavailable embeddings", () => {
    expect(semanticMatcher({ embedding: [1, 0] }, { embedding: [1, 0] }).score).toBe(1);
    expect(semanticMatcher({ embedding: [1, 0] }, { embedding: [0, 1] }).score).toBe(0);
    expect(semanticMatcher({}, {}).score).toBeNull();
  });

  it("preserves v1 semantics while v2 incorporates semantic evidence", () => {
    const candidate = { skills: [], embedding: [1, 0] };
    const job = { requiredSkills: ["React"], preferredSkills: [] };
    const jobProfile = { embedding: [1, 0] };
    expect(calculateMatch(candidate, job, jobProfile, { algorithmVersion: "v1" }).componentScores.semantic).toBe(1);
    const v2 = calculateMatch(candidate, job, jobProfile, { algorithmVersion: "v2" });
    expect(v2.matchScore).toBeLessThan(70);
    expect(v2.componentScores.semantic).toBe(1);
  });
});