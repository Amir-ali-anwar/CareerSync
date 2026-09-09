import { calculateMatch } from "../../services/matching/matchingService.js";
import { buildMatchExplanation } from "../../services/matching/explanationService.js";
import { getAlgorithmWeights } from "../../services/matching/algorithmVersions.js";

// Built via the REAL calculateMatch (not a hand-rolled fixture) so these tests exercise
// the actual Module E -> Module G boundary, not an assumption about MatchResult's shape.
const job = {
  requiredSkills: ["React", "TypeScript", "Node.js"],
  preferredSkills: ["Next.js", "AWS"],
  requiredExperience: 5,
  workMode: "remote",
  jobLocation: { city: "New York", country: "United States" },
};
const jobProfile = { seniority: "senior", domains: ["Fintech", "Healthcare"] };

describe("explanationService.buildMatchExplanation", () => {
  describe("a strong match", () => {
    const candidate = {
      // Aliases on purpose - normalization must collapse these to the job's canonical forms.
      skills: ["ReactJS", "TypeScript", "Node"],
      yearsOfExperience: 6, // exceeds requiredExperience (5)
      domains: ["Fintech"], // 1 of 2 job domains
      workModePreference: "remote",
      preferredLocations: ["New York"],
    };
    const matchResult = calculateMatch(candidate, job, jobProfile);
    const explanation = buildMatchExplanation(matchResult);

    it("carries the score, level, and algorithm version straight from the match result", () => {
      expect(explanation.matchScore).toBe(matchResult.matchScore);
      expect(explanation.matchingAlgorithmVersion).toBe(matchResult.matchingAlgorithmVersion);
      expect(explanation.matchLevel.level).toBeDefined();
    });

    it("identifies all required skills as matched, via normalization", () => {
      const required = explanation.matchedSkills.filter((s) => s.type === "required").map((s) => s.skill);
      expect(required.sort()).toEqual(["Node.js", "React", "TypeScript"]);
    });

    it("identifies the unmatched preferred skills as missing, medium importance", () => {
      expect(explanation.missingSkills).toEqual(
        expect.arrayContaining([
          { skill: "Next.js", type: "preferred", importance: "medium" },
          { skill: "AWS", type: "preferred", importance: "medium" },
        ])
      );
      expect(explanation.missingSkills.some((s) => s.type === "required")).toBe(false);
    });

    it("reports a partial domain match (1 of 2 job domains covered)", () => {
      const domainPartial = explanation.partialMatches.find((p) => p.category === "domain");
      expect(domainPartial).toBeDefined();
      expect(domainPartial.candidateValue).toEqual(["Fintech"]);
    });

    it("generates strengths that map back to real evidence", () => {
      const categories = explanation.strengths.map((s) => s.category);
      expect(categories).toEqual(expect.arrayContaining(["skills", "experience", "seniority", "preferences"]));
    });

    it("lists the missing preferred skills and the uncovered domain as improvements", () => {
      const items = explanation.improvements.map((i) => i.item);
      expect(items).toEqual(expect.arrayContaining(["Next.js", "AWS", "Healthcare"]));
    });

    it("produces a deterministic summary mentioning the matched skills, not hardcoded", () => {
      expect(explanation.summary).toContain(explanation.matchLevel.label);
      expect(explanation.summary).toMatch(/React|TypeScript|Node\.js/);
    });

    it("is fully deterministic for identical inputs", () => {
      const again = buildMatchExplanation(calculateMatch(candidate, job, jobProfile));
      expect(again).toEqual(explanation);
    });
  });

  describe("a weak match (missing required skills, no other data)", () => {
    const candidate = { skills: ["COBOL"] };
    const matchResult = calculateMatch(candidate, job, jobProfile);
    const explanation = buildMatchExplanation(matchResult);

    it("lists every required skill as missing, high importance", () => {
      const requiredMissing = explanation.missingSkills.filter((s) => s.type === "required");
      expect(requiredMissing.map((s) => s.skill).sort()).toEqual(["Node.js", "React", "TypeScript"]);
      requiredMissing.forEach((s) => expect(s.importance).toBe("high"));
    });

    it("does not fabricate a skills strength when required skills are largely unmet", () => {
      expect(explanation.strengths.some((s) => s.category === "skills")).toBe(false);
    });

    it("caps the improvements list rather than listing every possible gap", () => {
      expect(explanation.improvements.length).toBeLessThanOrEqual(8);
    });
  });

  describe("skill normalization (Module G spec example)", () => {
    it("treats React/React.js/ReactJS and Node/Node.js as the same skill, with no duplicate evidence", () => {
      const normalizationJob = { requiredSkills: ["React.js", "Node"] };
      const candidate = { skills: ["React", "Node.js"] };
      const matchResult = calculateMatch(candidate, normalizationJob, null);
      const explanation = buildMatchExplanation(matchResult);

      const matchedNames = explanation.matchedSkills.map((s) => s.skill).sort();
      expect(matchedNames).toEqual(["Node.js", "React"]);
      expect(explanation.missingSkills).toHaveLength(0);
    });
  });

  describe("partial matches - experience", () => {
    it("flags experience as a partial match when slightly below the requirement", () => {
      const candidate = { skills: [], yearsOfExperience: 4 }; // 4/5 = 0.8 -> slightly_below
      const matchResult = calculateMatch(candidate, job, null);
      const explanation = buildMatchExplanation(matchResult);
      const partial = explanation.partialMatches.find((p) => p.category === "experience");
      expect(partial).toMatchObject({ candidateValue: 4, requiredValue: 5 });
    });

    it("does not flag experience as partial when significantly below (that's an improvement, not a near-miss)", () => {
      const candidate = { skills: [], yearsOfExperience: 1 };
      const matchResult = calculateMatch(candidate, job, null);
      const explanation = buildMatchExplanation(matchResult);
      expect(explanation.partialMatches.some((p) => p.category === "experience")).toBe(false);
      expect(explanation.improvements.some((i) => i.category === "experience")).toBe(true);
    });

    it("treats meeting or exceeding experience as a strength, not a partial match", () => {
      const candidate = { skills: [], yearsOfExperience: 5 };
      const explanation = buildMatchExplanation(calculateMatch(candidate, job, null));
      expect(explanation.partialMatches.some((p) => p.category === "experience")).toBe(false);
      expect(explanation.strengths.some((s) => s.category === "experience")).toBe(true);
    });

    it("neither strength nor partial/improvement when experience data is missing entirely", () => {
      const candidate = { skills: [] };
      const explanation = buildMatchExplanation(calculateMatch(candidate, job, null));
      expect(explanation.partialMatches.some((p) => p.category === "experience")).toBe(false);
      expect(explanation.strengths.some((s) => s.category === "experience")).toBe(false);
      expect(explanation.improvements.some((i) => i.category === "experience")).toBe(false);
    });
  });

  describe("seniority", () => {
    it("exact match is a strength", () => {
      const candidate = { skills: [], yearsOfExperience: 6 }; // -> "senior"
      const explanation = buildMatchExplanation(calculateMatch(candidate, job, jobProfile)); // job is "senior"
      expect(explanation.strengths.some((s) => s.category === "seniority")).toBe(true);
    });

    it("adjacent level (distance 1) is a partial match, not a strength or improvement", () => {
      const candidate = { skills: [], yearsOfExperience: 3 }; // -> "mid" (distance 1 from senior)
      const explanation = buildMatchExplanation(calculateMatch(candidate, job, jobProfile));
      expect(explanation.partialMatches.some((p) => p.category === "seniority")).toBe(true);
      expect(explanation.strengths.some((s) => s.category === "seniority")).toBe(false);
      expect(explanation.improvements.some((i) => i.category === "seniority")).toBe(false);
    });

    it("distance >= 2 is an improvement, not a partial match", () => {
      const candidate = { skills: [], yearsOfExperience: 0 }; // -> "entry" (distance 2 from senior)
      const explanation = buildMatchExplanation(calculateMatch(candidate, job, jobProfile));
      expect(explanation.improvements.some((i) => i.category === "seniority")).toBe(true);
      expect(explanation.partialMatches.some((p) => p.category === "seniority")).toBe(false);
    });

    it("missing seniority data produces neither a strength, partial match, nor improvement", () => {
      const candidate = { skills: [] }; // no yearsOfExperience -> no inferred seniority
      const explanation = buildMatchExplanation(calculateMatch(candidate, job, jobProfile));
      expect(explanation.strengths.some((s) => s.category === "seniority")).toBe(false);
      expect(explanation.partialMatches.some((p) => p.category === "seniority")).toBe(false);
      expect(explanation.improvements.some((i) => i.category === "seniority")).toBe(false);
    });
  });

  describe("domain", () => {
    it("full overlap is a strength", () => {
      const candidate = { skills: [], domains: ["Fintech", "Healthcare"] };
      const explanation = buildMatchExplanation(calculateMatch(candidate, job, jobProfile));
      expect(explanation.strengths.some((s) => s.category === "domain")).toBe(true);
    });

    it("no overlap at all is an improvement for every job domain, not a partial match", () => {
      const candidate = { skills: [], domains: ["Retail"] };
      const explanation = buildMatchExplanation(calculateMatch(candidate, job, jobProfile));
      expect(explanation.partialMatches.some((p) => p.category === "domain")).toBe(false);
      const domainImprovements = explanation.improvements.filter((i) => i.category === "domain").map((i) => i.item);
      expect(domainImprovements.sort()).toEqual(["Fintech", "Healthcare"]);
    });

    it("missing domain data on either side produces no domain evidence at all", () => {
      const candidate = { skills: [] }; // no domains
      const jobProfileWithoutDomains = { seniority: "senior" }; // no domains either
      const explanation = buildMatchExplanation(calculateMatch(candidate, job, jobProfileWithoutDomains));
      expect(explanation.strengths.some((s) => s.category === "domain")).toBe(false);
      expect(explanation.partialMatches.some((p) => p.category === "domain")).toBe(false);
      expect(explanation.improvements.some((i) => i.category === "domain")).toBe(false);
    });
  });

  describe("semantic similarity respects algorithm-version weighting", () => {
    const candidate = { skills: [], embedding: [1, 0, 0] };
    const highSemanticJobProfile = { embedding: [1, 0, 0] };
    const lowSemanticJobProfile = { embedding: [0, 1, 0] };

    it("v2 (weights semantic) surfaces a strength when semantic similarity is high", () => {
      const matchResult = calculateMatch(candidate, job, highSemanticJobProfile, { algorithmVersion: "v2" });
      expect(getAlgorithmWeights("v2").semantic).toBeGreaterThan(0);
      const explanation = buildMatchExplanation(matchResult);
      expect(explanation.strengths.some((s) => s.category === "overall_fit")).toBe(true);
      const dim = explanation.scoreBreakdown.find((d) => d.dimension === "semantic");
      expect(dim.included).toBe(true);
      expect(dim.score).toBe(100);
    });

    it("v2 surfaces an improvement when semantic similarity is low", () => {
      const matchResult = calculateMatch(candidate, job, lowSemanticJobProfile, { algorithmVersion: "v2" });
      const explanation = buildMatchExplanation(matchResult);
      expect(explanation.improvements.some((i) => i.category === "overall_fit")).toBe(true);
    });

    it("v1 (does not weight semantic) never fabricates semantic strengths or improvements even when similarity is high", () => {
      expect(getAlgorithmWeights("v1").semantic).toBe(0);
      const matchResult = calculateMatch(candidate, job, highSemanticJobProfile, { algorithmVersion: "v1" });
      const explanation = buildMatchExplanation(matchResult);
      expect(explanation.strengths.some((s) => s.category === "overall_fit")).toBe(false);
      expect(explanation.improvements.some((i) => i.category === "overall_fit")).toBe(false);
      const dim = explanation.scoreBreakdown.find((d) => d.dimension === "semantic");
      expect(dim.included).toBe(false);
    });

    it("unavailable embeddings produce a null, non-included semantic dimension with no fabricated evidence", () => {
      const matchResult = calculateMatch({ skills: [] }, job, jobProfile, { algorithmVersion: "v2" });
      const explanation = buildMatchExplanation(matchResult);
      const dim = explanation.scoreBreakdown.find((d) => d.dimension === "semantic");
      expect(dim.score).toBeNull();
      expect(dim.included).toBe(false);
      expect(explanation.strengths.some((s) => s.category === "overall_fit")).toBe(false);
    });
  });

  describe("scoreBreakdown", () => {
    it("lists every weighted dimension with a 0-100 score, its weight as a percentage, and an included flag", () => {
      const candidate = { skills: ["React"], yearsOfExperience: 5 };
      const explanation = buildMatchExplanation(calculateMatch(candidate, job, jobProfile));
      const dims = explanation.scoreBreakdown.map((d) => d.dimension);
      expect(dims).toEqual(["requiredSkills", "preferredSkills", "experience", "seniority", "domain", "preferences", "semantic"]);
      explanation.scoreBreakdown.forEach((d) => {
        expect(d.score === null || (d.score >= 0 && d.score <= 100)).toBe(true);
        expect(d.weight).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
