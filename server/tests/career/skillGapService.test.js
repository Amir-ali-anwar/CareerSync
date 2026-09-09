import { calculateMatch } from "../../services/matching/matchingService.js";
import { buildSkillGapAnalysis } from "../../services/career/skillGapService.js";
import { getAlgorithmWeights } from "../../services/matching/algorithmVersions.js";

// Built via the REAL calculateMatch, same pattern as tests/matching/explanationService.test.js -
// exercises the actual Module E -> Module H boundary, not an assumed MatchResult shape.
const job = {
  requiredSkills: ["React", "TypeScript", "Node.js"],
  preferredSkills: ["Next.js", "AWS"],
  requiredExperience: 5,
  workMode: "remote",
  jobLocation: { city: "New York", country: "United States" },
};
const jobProfile = { seniority: "senior", domains: ["Fintech", "Healthcare"] };

describe("skillGapService.buildSkillGapAnalysis", () => {
  describe("a candidate with several gaps", () => {
    const candidate = {
      skills: ["React"], // missing TypeScript, Node.js (required); Next.js, AWS (preferred)
      yearsOfExperience: 4, // ratio 4/5 = 0.8 -> slightly_below
      domains: [], // no domain data -> domain excluded entirely
    };
    const matchResult = calculateMatch(candidate, job, jobProfile);
    const analysis = buildSkillGapAnalysis(matchResult, {
      candidateCertifications: [],
      jobCertifications: ["AWS Certified Solutions Architect"],
    });

    it("carries score/level/algorithm version straight from the match result", () => {
      expect(analysis.matchScore).toBe(matchResult.matchScore);
      expect(analysis.matchingAlgorithmVersion).toBe(matchResult.matchingAlgorithmVersion);
      expect(analysis.matchLevel.level).toBeDefined();
    });

    it("lists every missing required skill as a high-priority gap", () => {
      const required = analysis.gaps.filter((g) => g.category === "required_skill");
      expect(required.map((g) => g.item).sort()).toEqual(["Node.js", "TypeScript"]);
      required.forEach((g) => {
        expect(g.priority).toBe("high");
        expect(g.severity).toBe("high"); // only 2 missing, not 3+ -> not critical
        expect(g.affectedDimension).toBe("requiredSkills");
        expect(g.recommendedAction).toEqual({ type: "skill_development", focus: g.item });
      });
    });

    it("lists missing preferred skills as medium-priority gaps", () => {
      const preferred = analysis.gaps.filter((g) => g.category === "preferred_skill");
      expect(preferred.map((g) => g.item).sort()).toEqual(["AWS", "Next.js"]);
      preferred.forEach((g) => expect(g.priority).toBe("medium"));
    });

    it("lists a medium-priority experience gap for a near-miss", () => {
      const experience = analysis.gaps.find((g) => g.category === "experience");
      expect(experience).toMatchObject({ candidateValue: 4, requiredValue: 5, gap: 1, priority: "medium", severity: "medium" });
    });

    it("produces no domain gap when the candidate has no domain data at all", () => {
      expect(analysis.gaps.some((g) => g.category === "domain")).toBe(false);
    });

    it("lists a missing certification as a medium-priority gap", () => {
      const cert = analysis.gaps.find((g) => g.category === "certification");
      expect(cert).toMatchObject({ item: "AWS Certified Solutions Architect", priority: "medium", affectedDimension: null });
    });

    it("orders the roadmap with required skills ahead of preferred/experience/certification, using stable ordering within a tier", () => {
      const categories = analysis.prioritizedRoadmap.map((r) => r.category);
      const firstRequiredIndex = categories.indexOf("required_skill");
      const firstMediumIndex = categories.findIndex((c) => c !== "required_skill");
      expect(firstRequiredIndex).toBe(0);
      expect(firstMediumIndex).toBeGreaterThan(0);
      // Within the required_skill tier, order matches job.requiredSkills order (React matched, so
      // only TypeScript then Node.js remain, in that job-list order).
      const requiredOrder = analysis.gaps.filter((g) => g.category === "required_skill").map((g) => g.item);
      expect(requiredOrder).toEqual(["TypeScript", "Node.js"]);
    });

    it("assigns sequential, 1-based ranks with no gaps", () => {
      analysis.prioritizedRoadmap.forEach((item, index) => expect(item.rank).toBe(index + 1));
    });

    it("summarizes total/critical/high-priority counts correctly", () => {
      expect(analysis.summary.totalGaps).toBe(analysis.gaps.length);
      expect(analysis.summary.highPriorityGaps).toBe(2); // the 2 required skills
      expect(analysis.summary.criticalGaps).toBe(0);
      expect(analysis.summary.message).toMatch(/TypeScript|Node\.js/);
    });

    it("is fully deterministic for identical inputs", () => {
      const again = buildSkillGapAnalysis(calculateMatch(candidate, job, jobProfile), {
        candidateCertifications: [],
        jobCertifications: ["AWS Certified Solutions Architect"],
      });
      expect(again).toEqual(analysis);
    });
  });

  describe("a candidate who meets every required skill", () => {
    it("produces no required-skill gaps (never fabricates one)", () => {
      const candidate = { skills: ["React", "TypeScript", "Node.js"] };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, null));
      expect(analysis.gaps.some((g) => g.category === "required_skill")).toBe(false);
    });
  });

  describe("no gaps at all", () => {
    it("reports zero gaps and a positive summary message, not a fabricated gap", () => {
      const candidate = {
        skills: ["React", "TypeScript", "Node.js", "Next.js", "AWS"],
        yearsOfExperience: 6,
        domains: ["Fintech", "Healthcare"],
      };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, jobProfile));
      expect(analysis.gaps).toHaveLength(0);
      expect(analysis.prioritizedRoadmap).toHaveLength(0);
      expect(analysis.summary.totalGaps).toBe(0);
      expect(analysis.summary.message).toMatch(/No significant gaps/);
    });
  });

  describe("required skill severity: critical vs high", () => {
    it("marks 3+ missing required skills as critical", () => {
      const candidate = { skills: [] };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, null));
      const required = analysis.gaps.filter((g) => g.category === "required_skill");
      expect(required).toHaveLength(3);
      required.forEach((g) => expect(g.severity).toBe("critical"));
      expect(analysis.summary.criticalGaps).toBe(3);
    });

    it("marks 1-2 missing required skills as high, not critical", () => {
      const candidate = { skills: ["React", "TypeScript"] };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, null));
      const required = analysis.gaps.filter((g) => g.category === "required_skill");
      expect(required).toHaveLength(1);
      expect(required[0].severity).toBe("high");
    });
  });

  describe("skill normalization (spec example: React/Node aliasing)", () => {
    it("treats React/React.js and Node/Node.js as the same skill - no duplicate or fake gap", () => {
      const normalizationJob = { requiredSkills: ["React.js", "Node"] };
      const candidate = { skills: ["React", "Node.js"] };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, normalizationJob, null));
      expect(analysis.gaps.filter((g) => g.category === "required_skill")).toHaveLength(0);
    });
  });

  describe("experience gap variants", () => {
    it("candidate exceeds requirement -> no experience gap", () => {
      const candidate = { skills: [], yearsOfExperience: 6 };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, null));
      expect(analysis.gaps.some((g) => g.category === "experience")).toBe(false);
    });

    it("candidate meets requirement exactly -> no experience gap", () => {
      const candidate = { skills: [], yearsOfExperience: 5 };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, null));
      expect(analysis.gaps.some((g) => g.category === "experience")).toBe(false);
    });

    it("candidate slightly below (>= 80%) -> medium-priority gap", () => {
      const candidate = { skills: [], yearsOfExperience: 4 };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, null));
      const gap = analysis.gaps.find((g) => g.category === "experience");
      expect(gap.priority).toBe("medium");
    });

    it("candidate significantly below -> high-priority gap", () => {
      const candidate = { skills: [], yearsOfExperience: 1 };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, null));
      const gap = analysis.gaps.find((g) => g.category === "experience");
      expect(gap.priority).toBe("high");
      expect(gap.severity).toBe("high");
    });

    it("missing candidate experience data -> no gap (not treated as 0 years)", () => {
      const candidate = { skills: [] };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, null));
      expect(analysis.gaps.some((g) => g.category === "experience")).toBe(false);
    });

    it("missing job experience requirement -> no gap", () => {
      const jobWithoutRequirement = { requiredSkills: [] };
      const candidate = { skills: [], yearsOfExperience: 2 };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, jobWithoutRequirement, null));
      expect(analysis.gaps.some((g) => g.category === "experience")).toBe(false);
    });
  });

  describe("seniority gap variants", () => {
    it("exact match -> no gap", () => {
      const candidate = { skills: [], yearsOfExperience: 6 }; // "senior"
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, jobProfile)); // job is "senior"
      expect(analysis.gaps.some((g) => g.category === "seniority")).toBe(false);
    });

    it("candidate higher than required -> still a gap (distance-based, not directional), medium at distance 1", () => {
      const candidate = { skills: [], yearsOfExperience: 10 }; // "lead", job wants "senior" -> distance 1
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, jobProfile));
      const gap = analysis.gaps.find((g) => g.category === "seniority");
      expect(gap).toMatchObject({ candidateValue: "lead", requiredValue: "senior", priority: "medium" });
    });

    it("candidate lower than required by 2+ levels -> high-priority gap", () => {
      const candidate = { skills: [], yearsOfExperience: 0 }; // "entry", job wants "senior" -> distance 2
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, jobProfile));
      const gap = analysis.gaps.find((g) => g.category === "seniority");
      expect(gap.priority).toBe("high");
      expect(gap.recommendedAction).toEqual({ type: "experience_development" });
    });

    it("missing seniority data on either side -> no gap", () => {
      const candidate = { skills: [] }; // no yearsOfExperience -> no inferred seniority
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, jobProfile));
      expect(analysis.gaps.some((g) => g.category === "seniority")).toBe(false);
    });
  });

  describe("domain gap variants", () => {
    it("exact domain match -> no gap", () => {
      const candidate = { skills: [], domains: ["Fintech", "Healthcare"] };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, jobProfile));
      expect(analysis.gaps.some((g) => g.category === "domain")).toBe(false);
    });

    it("partial overlap -> low-priority gap for each uncovered domain", () => {
      const candidate = { skills: [], domains: ["Fintech"] };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, jobProfile));
      const domainGaps = analysis.gaps.filter((g) => g.category === "domain");
      expect(domainGaps.map((g) => g.item)).toEqual(["Healthcare"]);
      expect(domainGaps[0].priority).toBe("low");
    });

    it("no overlap at all -> medium-priority gap for each job domain", () => {
      const candidate = { skills: [], domains: ["Retail"] };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, jobProfile));
      const domainGaps = analysis.gaps.filter((g) => g.category === "domain");
      expect(domainGaps.map((g) => g.item).sort()).toEqual(["Fintech", "Healthcare"]);
      domainGaps.forEach((g) => expect(g.priority).toBe("medium"));
    });

    it("missing domain data on either side -> no gap", () => {
      const candidate = { skills: [] };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, { seniority: "senior" }));
      expect(analysis.gaps.some((g) => g.category === "domain")).toBe(false);
    });
  });

  describe("education", () => {
    it("is not implemented as a gap category (documented limitation, no fabricated comparison)", () => {
      const candidate = { skills: [] };
      const analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, null));
      expect(analysis.gaps.some((g) => g.category === "education")).toBe(false);
    });
  });

  describe("certification gap variants", () => {
    it("certification present (case/whitespace-insensitive match) -> no gap", () => {
      const analysis = buildSkillGapAnalysis(calculateMatch({ skills: [] }, job, null), {
        candidateCertifications: ["  aws certified solutions architect  "],
        jobCertifications: ["AWS Certified Solutions Architect"],
      });
      expect(analysis.gaps.some((g) => g.category === "certification")).toBe(false);
    });

    it("certification missing -> medium-priority gap", () => {
      const analysis = buildSkillGapAnalysis(calculateMatch({ skills: [] }, job, null), {
        candidateCertifications: [],
        jobCertifications: ["AWS Certified Solutions Architect"],
      });
      expect(analysis.gaps.filter((g) => g.category === "certification")).toHaveLength(1);
    });

    it("no certification requirement -> no gap generated even if candidate has none", () => {
      const analysis = buildSkillGapAnalysis(calculateMatch({ skills: [] }, job, null), {
        candidateCertifications: [],
        jobCertifications: [],
      });
      expect(analysis.gaps.some((g) => g.category === "certification")).toBe(false);
    });
  });

  describe("boundary cases", () => {
    it("handles completely empty candidate and job skill arrays without throwing", () => {
      const emptyJob = { requiredSkills: [], preferredSkills: [] };
      const analysis = buildSkillGapAnalysis(calculateMatch({ skills: [] }, emptyJob, null));
      expect(analysis.gaps).toEqual([]);
      expect(analysis.summary.totalGaps).toBe(0);
    });

    it("de-duplicates a job's own duplicate/aliased required skills the same way matching does", () => {
      const dupJob = { requiredSkills: ["React", "ReactJS", "React.js"] };
      const analysis = buildSkillGapAnalysis(calculateMatch({ skills: [] }, dupJob, null));
      const required = analysis.gaps.filter((g) => g.category === "required_skill");
      expect(required.map((g) => g.item)).toEqual(["React"]);
    });
  });

  describe("algorithm version propagation", () => {
    it("stamps the analysis with whichever algorithm version produced the match", () => {
      const candidate = { skills: [] };
      const v1Analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, null, { algorithmVersion: "v1" }));
      const v2Analysis = buildSkillGapAnalysis(calculateMatch(candidate, job, null, { algorithmVersion: "v2" }));
      expect(v1Analysis.matchingAlgorithmVersion).toBe("v1");
      expect(v2Analysis.matchingAlgorithmVersion).toBe("v2");
      expect(getAlgorithmWeights("v1").semantic).toBe(0);
      expect(getAlgorithmWeights("v2").semantic).toBeGreaterThan(0);
    });
  });
});
