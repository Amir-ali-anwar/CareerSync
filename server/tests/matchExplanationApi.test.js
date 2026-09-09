import request from "supertest";
import { createEmployerAgent, createTalentAgent, createJob, app } from "./helpers.js";
import CandidateProfileModel from "../models/CandidateProfileModel.js";

const PDF_BUFFER = Buffer.from("%PDF-1.4 fake pdf content for testing");

describe("GET /api/v1/jobs/:jobId/match/explanation", () => {
  it("returns a structured explanation for the authenticated talent against an existing job", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React", "TypeScript"] });
    const { agent: talent, user: talentUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentUser._id, skills: ["React"] });

    const res = await talent.get(`/api/v1/jobs/${job._id}/match/explanation`);
    expect(res.statusCode).toBe(200);
    const { explanation } = res.body;
    expect(explanation.matchScore).toBeGreaterThanOrEqual(0);
    expect(explanation.matchScore).toBeLessThanOrEqual(100);
    expect(explanation.matchLevel.level).toBeDefined();
    expect(explanation.matchingAlgorithmVersion).toBe("v2");
    expect(explanation.matchedSkills).toEqual(expect.arrayContaining([{ skill: "React", type: "required" }]));
    expect(explanation.missingSkills).toEqual(expect.arrayContaining([{ skill: "TypeScript", type: "required", importance: "high" }]));
    expect(Array.isArray(explanation.scoreBreakdown)).toBe(true);
    expect(typeof explanation.summary).toBe("string");
  });

  it("never exposes raw resume text, embeddings, or profile internals", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React"] });
    const { agent: talent, user: talentUser } = await createTalentAgent();
    await CandidateProfileModel.create({
      user: talentUser._id,
      skills: ["React"],
      resumeText: "SECRET RESUME CONTENTS - should never leak",
      embedding: [0.1, 0.2, 0.3],
    });

    const res = await talent.get(`/api/v1/jobs/${job._id}/match/explanation`);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/SECRET RESUME CONTENTS/);
    expect(serialized).not.toMatch(/0\.1,0\.2,0\.3/);
    expect(res.body.explanation).not.toHaveProperty("embedding");
    expect(res.body.explanation).not.toHaveProperty("resumeText");
  });

  it("rejects an unauthenticated request", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer);
    const res = await request(app).get(`/api/v1/jobs/${job._id}/match/explanation`);
    expect(res.statusCode).toBe(401);
  });

  it("forbids an employer from using the candidate-facing explanation endpoint", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer);
    const res = await employer.get(`/api/v1/jobs/${job._id}/match/explanation`);
    expect(res.statusCode).toBe(403);
  });

  it("returns 404 for a nonexistent job", async () => {
    const { agent: talent } = await createTalentAgent();
    const res = await talent.get("/api/v1/jobs/64b7f3f3f3f3f3f3f3f3f3f3/match/explanation");
    expect(res.statusCode).toBe(404);
  });

  it("returns 400 for a malformed job id (no raw 500 leak)", async () => {
    const { agent: talent } = await createTalentAgent();
    const res = await talent.get("/api/v1/jobs/not-a-valid-id/match/explanation");
    expect(res.statusCode).toBe(400);
  });

  it("never leaks another candidate's explanation under this candidate's identity (IDOR - identity comes from the session, not the URL)", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React", "Python"] });

    const { agent: talentA, user: talentAUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentAUser._id, skills: ["React"] });

    const { agent: talentB, user: talentBUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentBUser._id, skills: ["Python"] });

    const resA = await talentA.get(`/api/v1/jobs/${job._id}/match/explanation`);
    const resB = await talentB.get(`/api/v1/jobs/${job._id}/match/explanation`);

    const matchedA = resA.body.explanation.matchedSkills.map((s) => s.skill);
    const matchedB = resB.body.explanation.matchedSkills.map((s) => s.skill);
    expect(matchedA).toEqual(["React"]);
    expect(matchedB).toEqual(["Python"]);
  });

  it("still returns a usable explanation when the candidate has no CandidateProfile yet", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React"] });
    const { agent: talent } = await createTalentAgent();

    const res = await talent.get(`/api/v1/jobs/${job._id}/match/explanation`);
    expect(res.statusCode).toBe(200);
    expect(res.body.explanation.candidateProfileStatus).toBe("not_found");
    expect(res.body.explanation.missingSkills).toEqual([{ skill: "React", type: "required", importance: "high" }]);
  });
});

describe("GET /api/v1/applications/:jobId/:applicantId/match/explanation", () => {
  async function applyAsTalent(jobId) {
    const { agent: talent, user: talentUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentUser._id, skills: ["React"] });
    await talent
      .post(`/api/v1/jobs/applyForJob/${jobId}`)
      .attach("cv", PDF_BUFFER, { filename: "resume.pdf", contentType: "application/pdf" });
    return { talent, talentUser };
  }

  it("returns the explanation to the owning employer for a real applicant", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React"] });
    const { talentUser } = await applyAsTalent(job._id);

    const res = await employer.get(`/api/v1/applications/${job._id}/${talentUser._id}/match/explanation`);
    expect(res.statusCode).toBe(200);
    expect(res.body.explanation.matchedSkills).toEqual(expect.arrayContaining([{ skill: "React", type: "required" }]));
  });

  it("forbids a non-owner employer (IDOR protection, same rule as every other employer/job route)", async () => {
    const { agent: owner } = await createEmployerAgent();
    const { agent: other } = await createEmployerAgent();
    const job = await createJob(owner, { requiredSkills: ["React"] });
    const { talentUser } = await applyAsTalent(job._id);

    const res = await other.get(`/api/v1/applications/${job._id}/${talentUser._id}/match/explanation`);
    expect(res.statusCode).toBe(403);
  });

  it("forbids a talent from using the employer-facing explanation endpoint", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer);
    const { agent: talent, user: talentUser } = await createTalentAgent();

    const res = await talent.get(`/api/v1/applications/${job._id}/${talentUser._id}/match/explanation`);
    expect(res.statusCode).toBe(403);
  });

  it("rejects an unauthenticated request", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer);
    const { talentUser } = await applyAsTalent(job._id);

    const res = await request(app).get(`/api/v1/applications/${job._id}/${talentUser._id}/match/explanation`);
    expect(res.statusCode).toBe(401);
  });

  it("returns 404 when the given user never applied to this job (not just any candidate id)", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React"] });
    const { agent: talent, user: talentUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentUser._id, skills: ["React"] });
    // Deliberately never applies.

    const res = await employer.get(`/api/v1/applications/${job._id}/${talentUser._id}/match/explanation`);
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 for a nonexistent job", async () => {
    const { agent: employer } = await createEmployerAgent();
    const res = await employer.get(
      "/api/v1/applications/64b7f3f3f3f3f3f3f3f3f3f3/64b7f3f3f3f3f3f3f3f3f3f3/match/explanation"
    );
    expect(res.statusCode).toBe(404);
  });
});
