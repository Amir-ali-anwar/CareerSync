import { aggregateScores } from "../../services/matching/scoreAggregator.js";
import { getAlgorithmWeights } from "../../services/matching/algorithmVersions.js";

const weights = getAlgorithmWeights("v1");

describe("scoreAggregator", () => {
  it("returns 100 when every dimension scores a perfect 1", () => {
    const perfect = {
      requiredSkills: { score: 1 },
      preferredSkills: { score: 1 },
      experience: { score: 1 },
      seniority: { score: 1 },
      domain: { score: 1 },
      preferences: { score: 1 },
      semantic: { score: null },
    };
    expect(aggregateScores(perfect, weights)).toBe(100);
  });

  it("returns 0 when every dimension scores 0", () => {
    const zero = {
      requiredSkills: { score: 0 },
      preferredSkills: { score: 0 },
      experience: { score: 0 },
      seniority: { score: 0 },
      domain: { score: 0 },
      preferences: { score: 0 },
      semantic: { score: null },
    };
    expect(aggregateScores(zero, weights)).toBe(0);
  });

  it("stays within 0..100 for a mixed set of scores", () => {
    const mixed = {
      requiredSkills: { score: 0.6 },
      preferredSkills: { score: 0.3 },
      experience: { score: 0.9 },
      seniority: { score: 0.2 },
      domain: { score: 0.5 },
      preferences: { score: 0.7 },
      semantic: { score: null },
    };
    const score = aggregateScores(mixed, weights);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("is deterministic - the same input always produces the same score", () => {
    const input = {
      requiredSkills: { score: 0.8 },
      preferredSkills: { score: 0.5 },
      experience: { score: 1 },
      seniority: { score: 0.67 },
      domain: { score: 0 },
      preferences: { score: 1 },
      semantic: { score: null },
    };
    const first = aggregateScores(input, weights);
    const second = aggregateScores(input, weights);
    expect(first).toBe(second);
  });

  it("renormalizes over available dimensions when some are excluded (null)", () => {
    // Only requiredSkills (perfect) has data; everything else is unknown/excluded.
    const onlyRequiredSkillsKnown = {
      requiredSkills: { score: 1 },
      preferredSkills: { score: null },
      experience: { score: null },
      seniority: { score: null },
      domain: { score: null },
      preferences: { score: null },
      semantic: { score: null },
    };
    // Renormalized over just requiredSkills' own weight -> should still be a perfect 100,
    // not diluted down by the excluded dimensions being treated as 0.
    expect(aggregateScores(onlyRequiredSkillsKnown, weights)).toBe(100);
  });

  it("gives required-skill match more influence than preferred-skill match", () => {
    const strongRequiredWeakPreferred = {
      requiredSkills: { score: 1 },
      preferredSkills: { score: 0 },
      experience: { score: null },
      seniority: { score: null },
      domain: { score: null },
      preferences: { score: null },
      semantic: { score: null },
    };
    const weakRequiredStrongPreferred = {
      requiredSkills: { score: 0 },
      preferredSkills: { score: 1 },
      experience: { score: null },
      seniority: { score: null },
      domain: { score: null },
      preferences: { score: null },
      semantic: { score: null },
    };
    const strongRequiredScore = aggregateScores(strongRequiredWeakPreferred, weights);
    const weakRequiredScore = aggregateScores(weakRequiredStrongPreferred, weights);
    expect(strongRequiredScore).toBeGreaterThan(weakRequiredScore);
  });

  it("a 0-weight dimension (semantic in v1) never contributes even if it somehow had a score", () => {
    const withoutSemantic = {
      requiredSkills: { score: 1 },
      preferredSkills: { score: 1 },
      experience: { score: 1 },
      seniority: { score: 1 },
      domain: { score: 1 },
      preferences: { score: 1 },
      semantic: { score: null },
    };
    const withFakeSemantic = { ...withoutSemantic, semantic: { score: 0 } }; // pretend it had a bad score
    expect(aggregateScores(withoutSemantic, weights)).toBe(aggregateScores(withFakeSemantic, weights));
  });

  it("returns 0 in the fully-degenerate case where every dimension is excluded", () => {
    const allUnknown = {
      requiredSkills: { score: null },
      preferredSkills: { score: null },
      experience: { score: null },
      seniority: { score: null },
      domain: { score: null },
      preferences: { score: null },
      semantic: { score: null },
    };
    expect(aggregateScores(allUnknown, weights)).toBe(0);
  });
});
