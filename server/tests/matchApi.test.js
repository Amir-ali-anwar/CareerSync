import request from "supertest";
import { createEmployerAgent, createTalentAgent, createJob, app } from "./helpers.js";
import CandidateProfileModel from "../models/CandidateProfileModel.js";

describe("GET /api/v1/jobs/:jobId/match", () => {
  it("returns a match score for the authenticated talent against an existing job", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React"] });
    const { agent: talent, user: talentUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentUser._id, skills: ["React"] });

    const res = await talent.get(`/api/v1/jobs/${job._id}/match`);
    expect(res.statusCode).toBe(200);
    expect(res.body.match.matchScore).toBeGreaterThanOrEqual(0);
    expect(res.body.match.matchScore).toBeLessThanOrEqual(100);
    expect(res.body.match.matchingAlgorithmVersion).toBe("v2");
  });

  it("rejects an unauthenticated request", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer);

    const res = await request(app).get(`/api/v1/jobs/${job._id}/match`);
    expect(res.statusCode).toBe(401);
  });

  it("forbids an employer from using the candidate-facing match endpoint", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer);

    const res = await employer.get(`/api/v1/jobs/${job._id}/match`);
    expect(res.statusCode).toBe(403);
  });

  it("returns 404 for a nonexistent job", async () => {
    const { agent: talent } = await createTalentAgent();
    const res = await talent.get("/api/v1/jobs/64b7f3f3f3f3f3f3f3f3f3f3/match");
    expect(res.statusCode).toBe(404);
  });

  it("returns 400 for a malformed job id (no raw 500 leak)", async () => {
    const { agent: talent } = await createTalentAgent();
    const res = await talent.get("/api/v1/jobs/not-a-valid-id/match");
    expect(res.statusCode).toBe(400);
  });

  it("still returns a usable score when the candidate has no CandidateProfile yet", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer);
    const { agent: talent } = await createTalentAgent();

    const res = await talent.get(`/api/v1/jobs/${job._id}/match`);
    expect(res.statusCode).toBe(200);
    expect(res.body.match.candidateProfileStatus).toBe("not_found");
    expect(res.body.match.matchScore).toBeGreaterThanOrEqual(0);
  });

  it("never leaks another candidate's match under this candidate's identity (no IDOR vector - identity comes from the session, not the URL)", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React", "Python"] });

    const { agent: talentA, user: talentAUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentAUser._id, skills: ["React"] });

    const { agent: talentB, user: talentBUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentBUser._id, skills: ["Python"] });

    const resA = await talentA.get(`/api/v1/jobs/${job._id}/match`);
    const resB = await talentB.get(`/api/v1/jobs/${job._id}/match`);

    // Each candidate sees ONLY their own profile's evidence, never the other's.
    expect(resA.body.match.matchedSkills).toEqual(["React"]);
    expect(resB.body.match.matchedSkills).toEqual(["Python"]);
  });
});

describe("GET /api/v1/applications/job/:jobId (employer view, match-annotated)", () => {
  const PDF_BUFFER = Buffer.from("%PDF-1.4 fake pdf content for testing");

  it("annotates each applicant with a match object, authorized only for the owning employer", async () => {
    const { agent: employer } = await createEmployerAgent();
    const job = await createJob(employer, { requiredSkills: ["React"] });
    const { agent: talent, user: talentUser } = await createTalentAgent();
    await CandidateProfileModel.create({ user: talentUser._id, skills: ["React"] });

    await talent
      .post(`/api/v1/jobs/applyForJob/${job._id}`)
      .attach("cv", PDF_BUFFER, { filename: "resume.pdf", contentType: "application/pdf" });

    const res = await employer.get(`/api/v1/applications/job/${job._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.applications).toHaveLength(1);
    expect(res.body.applications[0].match).toBeDefined();
    expect(res.body.applications[0].match.componentScores.requiredSkills).toBe(1);
  });

  it("forbids a non-owner employer from seeing match-annotated applications (existing IDOR protection preserved)", async () => {
    const { agent: owner } = await createEmployerAgent();
    const { agent: other } = await createEmployerAgent();
    const job = await createJob(owner);

    const res = await other.get(`/api/v1/applications/job/${job._id}`);
    expect(res.statusCode).toBe(403);
  });
});
