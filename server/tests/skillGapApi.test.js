import request from "supertest";
import { createEmployerAgent, createTalentAgent, createJob, validJobPayload, app } from "./helpers.js";
import CandidateProfileModel from "../models/CandidateProfileModel.js";
import JobModel from "../models/JobsModel.js";
import JobProfileModel from "../models/JobProfileModel.js";

describe("GET /api/v1/jobs/:jobId/skill-gap", () => {
  it("returns a structured gap analysis for the authenticated talent against an existing job", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React", "TypeScript"] });
    const { agent: talent, user: talentUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentUser._id, skills: ["React"] });

    const res = await talent.get(`/api/v1/jobs/${job._id}/skill-gap`);
    expect(res.statusCode).toBe(200);
    const { gapAnalysis } = res.body;
    expect(gapAnalysis.matchScore).toBeGreaterThanOrEqual(0);
    expect(gapAnalysis.matchLevel.level).toBeDefined();
    expect(gapAnalysis.matchingAlgorithmVersion).toBe("v2");
    expect(gapAnalysis.gaps.some((g) => g.category === "required_skill" && g.item === "TypeScript")).toBe(true);
    expect(gapAnalysis.summary.totalGaps).toBe(gapAnalysis.gaps.length);
    expect(Array.isArray(gapAnalysis.prioritizedRoadmap)).toBe(true);
    expect(gapAnalysis.prioritizedRoadmap[0]).toHaveProperty("rank", 1);
  });

  it("includes a certification gap sourced from the candidate's and job's certifications fields", async () => {
    // Job intelligence (which populates JobProfile.certifications from the description
    // via the AI provider) runs fire-and-forget after POST /jobs - racing against it here
    // would be flaky. Construct the Job + JobProfile directly instead (same pattern as
    // tests/jobIntelligenceService.test.js), so this test controls the certifications
    // list deterministically without depending on that background job's timing.
    const { user: employerUser } = await createEmployerAgent();
    const job = await JobModel.create({ ...validJobPayload({ requiredSkills: [] }), createdBy: employerUser._id });
    await JobProfileModel.create({
      job: job._id,
      certifications: ["AWS Certified Solutions Architect"],
      processingStatus: "completed",
    });

    const { agent: talent, user: talentUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentUser._id, skills: [], certifications: [] });

    const res = await talent.get(`/api/v1/jobs/${job._id}/skill-gap`);
    expect(res.statusCode).toBe(200);
    expect(res.body.gapAnalysis.gaps).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: "certification", item: "AWS Certified Solutions Architect" })])
    );
  });

  it("never exposes raw resume text or embeddings", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React"] });
    const { agent: talent, user: talentUser } = await createTalentAgent();
    await CandidateProfileModel.create({
      user: talentUser._id,
      skills: ["React"],
      resumeText: "SECRET RESUME CONTENTS - should never leak",
      embedding: [0.1, 0.2, 0.3],
    });

    const res = await talent.get(`/api/v1/jobs/${job._id}/skill-gap`);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/SECRET RESUME CONTENTS/);
    expect(serialized).not.toMatch(/0\.1,0\.2,0\.3/);
  });

  it("rejects an unauthenticated request", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer);
    const res = await request(app).get(`/api/v1/jobs/${job._id}/skill-gap`);
    expect(res.statusCode).toBe(401);
  });

  it("forbids an employer from using the candidate-facing skill-gap endpoint (analysis is candidate-private)", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer);
    const res = await employer.get(`/api/v1/jobs/${job._id}/skill-gap`);
    expect(res.statusCode).toBe(403);
  });

  it("returns 404 for a nonexistent job", async () => {
    const { agent: talent } = await createTalentAgent();
    const res = await talent.get("/api/v1/jobs/64b7f3f3f3f3f3f3f3f3f3f3/skill-gap");
    expect(res.statusCode).toBe(404);
  });

  it("returns 400 for a malformed job id (no raw 500 leak)", async () => {
    const { agent: talent } = await createTalentAgent();
    const res = await talent.get("/api/v1/jobs/not-a-valid-id/skill-gap");
    expect(res.statusCode).toBe(400);
  });

  it("never leaks another candidate's gap analysis under this candidate's identity (IDOR - identity comes from the session, not the URL)", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React", "Python"] });

    const { agent: talentA, user: talentAUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentAUser._id, skills: ["React"] });

    const { agent: talentB, user: talentBUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentBUser._id, skills: ["Python"] });

    const resA = await talentA.get(`/api/v1/jobs/${job._id}/skill-gap`);
    const resB = await talentB.get(`/api/v1/jobs/${job._id}/skill-gap`);

    const gapsA = resA.body.gapAnalysis.gaps.filter((g) => g.category === "required_skill").map((g) => g.item);
    const gapsB = resB.body.gapAnalysis.gaps.filter((g) => g.category === "required_skill").map((g) => g.item);
    expect(gapsA).toEqual(["Python"]);
    expect(gapsB).toEqual(["React"]);
  });

  it("still returns a usable analysis when the candidate has no CandidateProfile yet", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React"] });
    const { agent: talent } = await createTalentAgent();

    const res = await talent.get(`/api/v1/jobs/${job._id}/skill-gap`);
    expect(res.statusCode).toBe(200);
    expect(res.body.gapAnalysis.candidateProfileStatus).toBe("not_found");
    expect(res.body.gapAnalysis.gaps).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: "required_skill", item: "React" })])
    );
  });

  it("reports no gaps for a candidate who already meets every required skill", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React"] });
    const { agent: talent, user: talentUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentUser._id, skills: ["React"] });

    const res = await talent.get(`/api/v1/jobs/${job._id}/skill-gap`);
    expect(res.statusCode).toBe(200);
    expect(res.body.gapAnalysis.gaps.some((g) => g.category === "required_skill")).toBe(false);
  });
});
