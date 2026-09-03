import {
  calculateMatch,
  calculateMatchForCandidateAndJob,
  calculateMatchesForCandidates,
} from "../../services/matching/matchingService.js";
import { MATCHING_ALGORITHM_VERSION } from "../../services/matching/algorithmVersions.js";
import CandidateProfileModel from "../../models/CandidateProfileModel.js";
import JobProfileModel from "../../models/JobProfileModel.js";
import { createEmployerAgent, createTalentAgent, createJob } from "../helpers.js";
import JobModel from "../../models/JobsModel.js";
import User from "../../models/User.js";
import { talentPayload } from "../helpers.js";

describe("matchingService.calculateMatch (pure, deterministic core)", () => {
  const job = {
    requiredSkills: ["React", "TypeScript", "Node.js"],
    preferredSkills: ["Next.js", "AWS", "Docker"],
    requiredExperience: 5,
    workMode: "remote",
    jobLocation: { city: "New York", country: "United States" },
  };
  const jobProfile = { seniority: "senior", domains: ["Fintech"] };

  it("stamps the current matching algorithm version", () => {
    const result = calculateMatch({ skills: [] }, job, jobProfile);
    expect(result.matchingAlgorithmVersion).toBe(MATCHING_ALGORITHM_VERSION);
  });

  it("produces a score between 0 and 100", () => {
    const result = calculateMatch({ skills: ["React"] }, job, jobProfile);
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);
  });

  it("is deterministic for identical inputs", () => {
    const candidate = { skills: ["React", "TypeScript"], yearsOfExperience: 5 };
    const first = calculateMatch(candidate, job, jobProfile);
    const second = calculateMatch(candidate, job, jobProfile);
    expect(first.matchScore).toBe(second.matchScore);
  });

  it("returns structured, explainable evidence (no LLM explanation text)", () => {
    const candidate = { skills: ["React", "TypeScript"], yearsOfExperience: 3 };
    const result = calculateMatch(candidate, job, jobProfile);
    expect(result.matchedSkills).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(result.missingRequiredSkills).toEqual(["Node.js"]);
    expect(result.experienceComparison.status).toBeDefined();
    expect(result).not.toHaveProperty("explanation");
  });

  it("handles a completely missing CandidateProfile without throwing", () => {
    const result = calculateMatch(null, job, jobProfile);
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.missingRequiredSkills).toEqual(job.requiredSkills);
  });

  it("handles a completely missing JobProfile without throwing", () => {
    const candidate = { skills: ["React", "TypeScript", "Node.js"], yearsOfExperience: 6 };
    const result = calculateMatch(candidate, job, null);
    // Skill/experience/preference dimensions still compute fine from Job's own fields;
    // only seniority/domain (which depend on JobProfile) are excluded.
    expect(result.componentScores.requiredSkills).toBe(1);
    expect(result.componentScores.seniority).toBeNull();
    expect(result.componentScores.domain).toBeNull();
    expect(result.matchScore).toBeGreaterThan(0);
  });
});

describe("Evaluation dataset (Module E7 - deterministic ranking fixture)", () => {
  // Fixture adapted directly from the module brief's own example dataset.
  const targetJob = {
    requiredSkills: ["React", "TypeScript", "Node.js"],
    preferredSkills: ["Next.js", "AWS", "Docker"],
    requiredExperience: 5,
    workMode: "remote",
  };
  const targetJobProfile = { seniority: "senior", domains: ["Fintech"] };

  const candidateA = {
    skills: ["React", "TypeScript", "Next.js", "Node.js", "MongoDB", "AWS"],
    yearsOfExperience: 6,
    domains: ["Fintech"],
    workModePreference: "remote",
  };
  const candidateB = {
    skills: ["React", "JavaScript", "HTML", "CSS"],
    yearsOfExperience: 2,
    domains: ["E-Commerce"],
    workModePreference: "remote",
  };
  const candidateC = {
    skills: ["Python", "Django", "PostgreSQL", "AWS"],
    yearsOfExperience: 5,
    domains: ["Fintech"],
    workModePreference: "onsite",
  };

  it("ranks Candidate A significantly above B and C", () => {
    const scoreA = calculateMatch(candidateA, targetJob, targetJobProfile).matchScore;
    const scoreB = calculateMatch(candidateB, targetJob, targetJobProfile).matchScore;
    const scoreC = calculateMatch(candidateC, targetJob, targetJobProfile).matchScore;

    expect(scoreA).toBeGreaterThan(scoreB);
    expect(scoreA).toBeGreaterThan(scoreC);
    // "Significantly" above, not just marginally - A has every required skill, meets
    // experience, and domain/work-mode fit; B and C are each missing something major.
    expect(scoreA - scoreB).toBeGreaterThanOrEqual(20);
    expect(scoreA - scoreC).toBeGreaterThanOrEqual(15);
  });

  it("ranking is stable across repeated computation (deterministic)", () => {
    const run = () =>
      [candidateA, candidateB, candidateC]
        .map((c) => calculateMatch(c, targetJob, targetJobProfile).matchScore)
        .join(",");
    expect(run()).toBe(run());
  });
});

describe("matchingService.calculateMatchForCandidateAndJob (DB-integrated)", () => {
  it("returns null when the job doesn't exist (caller 404s)", async () => {
    const result = await calculateMatchForCandidateAndJob(
      "64b7f3f3f3f3f3f3f3f3f3f3",
      "64b7f3f3f3f3f3f3f3f3f3f3"
    );
    expect(result).toBeNull();
  });

  it("reports candidateProfileStatus 'not_found' when the candidate has no profile yet", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer);
    const talent = await User.create(talentPayload());

    const result = await calculateMatchForCandidateAndJob(talent._id, job._id);
    expect(result.candidateProfileStatus).toBe("not_found");
    expect(result.candidateProfileVersion).toBeNull();
  });

  it("reports jobProfileStatus 'not_found' when job intelligence hasn't produced a profile", async () => {
    const { agent: employer, user: employerUser } = await createEmployerAgent();
    // Created directly (bypassing the fire-and-forget trigger) so no JobProfile exists yet.
    const job = await JobModel.create({
      company: "Test Co",
      position: "Engineer",
      jobLocation: { country: "US", city: "NYC" },
      description: "test",
      createdBy: employerUser._id,
    });
    const talent = await User.create(talentPayload());

    const result = await calculateMatchForCandidateAndJob(talent._id, job._id);
    expect(result.jobProfileStatus).toBe("not_found");
    expect(result.jobProfileVersion).toBeNull();
    // Still produces a usable score from Job's own authoritative fields.
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
  });

  it("reports a 'failed' jobProfileStatus without crashing, using Job's own fields regardless", async () => {
    // Created directly (bypassing the controller) so the real fire-and-forget job-
    // intelligence trigger never races with this test's manually-created JobProfile.
    const { user: employerUser } = await createEmployerAgent();
    const job = await JobModel.create({
      company: "Test Co",
      position: "Engineer",
      jobLocation: { country: "US", city: "NYC" },
      description: "test",
      createdBy: employerUser._id,
    });
    await JobProfileModel.create({ job: job._id, processingStatus: "failed" });
    const talent = await User.create(talentPayload());

    const result = await calculateMatchForCandidateAndJob(talent._id, job._id);
    expect(result.jobProfileStatus).toBe("failed");
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
  });

  it("surfaces the correct candidateProfileVersion/jobProfileVersion for stale-detection by the caller", async () => {
    const { user: employerUser } = await createEmployerAgent();
    const job = await JobModel.create({
      company: "Test Co",
      position: "Engineer",
      jobLocation: { country: "US", city: "NYC" },
      description: "test",
      createdBy: employerUser._id,
    });
    await JobProfileModel.create({ job: job._id, processingStatus: "completed", profileVersion: 5 });
    const talent = await User.create(talentPayload());
    await CandidateProfileModel.create({ user: talent._id, processingStatus: "completed", profileVersion: 3 });

    const result = await calculateMatchForCandidateAndJob(talent._id, job._id);
    expect(result.candidateProfileVersion).toBe(3);
    expect(result.jobProfileVersion).toBe(5);
    expect(result.matchingAlgorithmVersion).toBe(MATCHING_ALGORITHM_VERSION);
  });
});

describe("matchingService.calculateMatchesForCandidates (bulk, no N+1)", () => {
  it("computes an isolated match per candidate without mixing data between them", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React"] });
    const talentA = await User.create(talentPayload());
    const talentB = await User.create(talentPayload());
    await CandidateProfileModel.create({ user: talentA._id, skills: ["React"] });
    await CandidateProfileModel.create({ user: talentB._id, skills: ["Python"] });

    const results = await calculateMatchesForCandidates([talentA._id, talentB._id], job, null);

    expect(results[String(talentA._id)].componentScores.requiredSkills).toBe(1);
    expect(results[String(talentB._id)].componentScores.requiredSkills).toBe(0);
  });

  it("handles a candidate with no profile in the batch gracefully", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React"] });
    const talentWithProfile = await User.create(talentPayload());
    const talentWithoutProfile = await User.create(talentPayload());
    await CandidateProfileModel.create({ user: talentWithProfile._id, skills: ["React"] });

    const results = await calculateMatchesForCandidates(
      [talentWithProfile._id, talentWithoutProfile._id],
      job,
      null
    );

    expect(results[String(talentWithoutProfile._id)].candidateProfileStatus).toBe("not_found");
    expect(results[String(talentWithoutProfile._id)].matchScore).toBeGreaterThanOrEqual(0);
  });
});
