import request from "supertest";
import { app, createEmployerAgent, createTalentAgent, createJob } from "./helpers.js";
import CandidateProfileModel from "../models/CandidateProfileModel.js";

const PDF_BUFFER = Buffer.from("%PDF-1.4 fake pdf content for testing");

describe("GET /api/v1/candidate-profile", () => {
  it("returns 404 when the caller has no profile yet", async () => {
    const { agent: talent } = await createTalentAgent();
    const res = await talent.get("/api/v1/candidate-profile");
    expect(res.statusCode).toBe(404);
  });

  it("returns the caller's own profile", async () => {
    const { agent: talent, user } = await createTalentAgent();
    await CandidateProfileModel.create({ user: user._id, skills: ["React", "Node.js"] });

    const res = await talent.get("/api/v1/candidate-profile");
    expect(res.statusCode).toBe(200);
    expect(res.body.profile.skills).toEqual(["React", "Node.js"]);
  });

  it("forbids an employer from using the talent-only profile endpoint", async () => {
    const { agent: employer } = await createEmployerAgent();
    const res = await employer.get("/api/v1/candidate-profile");
    expect(res.statusCode).toBe(403);
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/v1/candidate-profile");
    expect(res.statusCode).toBe(401);
  });
});

describe("PATCH /api/v1/candidate-profile", () => {
  it("creates a profile on first edit (upsert) with only whitelisted fields", async () => {
    const { agent: talent, user } = await createTalentAgent();

    const res = await talent.patch("/api/v1/candidate-profile").send({
      skills: ["Python", "Django"],
      yearsOfExperience: 3,
      workModePreference: "remote",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.profile.skills).toEqual(["Python", "Django"]);
    expect(res.body.profile.yearsOfExperience).toBe(3);
    expect(res.body.profile.profileVersion).toBe(1);

    const saved = await CandidateProfileModel.findOne({ user: user._id });
    expect(saved.workModePreference).toBe("remote");
  });

  it("ignores non-whitelisted fields (processingStatus, embedding, user cannot be client-set)", async () => {
    const { agent: talent, user } = await createTalentAgent();
    await CandidateProfileModel.create({ user: user._id, skills: ["React"] });

    const otherUserId = "64b7f3f3f3f3f3f3f3f3f3f3";
    const res = await talent.patch("/api/v1/candidate-profile").send({
      skills: ["React", "TypeScript"],
      processingStatus: "completed",
      profileVersion: 999,
      user: otherUserId,
    });

    expect(res.statusCode).toBe(200);
    const saved = await CandidateProfileModel.findOne({ user: user._id });
    expect(saved.user.toString()).toBe(user._id.toString());
    expect(saved.profileVersion).toBe(1); // incremented by the server, not set to 999
  });

  it("rejects an empty update body", async () => {
    const { agent: talent } = await createTalentAgent();
    const res = await talent.patch("/api/v1/candidate-profile").send({});
    expect(res.statusCode).toBe(400);
  });

  it("forbids an employer from editing a candidate profile", async () => {
    const { agent: employer } = await createEmployerAgent();
    const res = await employer.patch("/api/v1/candidate-profile").send({ skills: ["React"] });
    expect(res.statusCode).toBe(403);
  });
});

describe("POST /api/v1/candidate-profile/resume", () => {
  // These tests only assert the synchronous HTTP response - resume processing itself
  // is fire-and-forget (see resumeProcessingService.test.js for direct, deterministic
  // coverage of the extraction/AI pipeline), so the real (fake-provider-backed) AI
  // service running against this fixture's non-PDF content in the background doesn't
  // affect these assertions either way.

  it("rejects a request with no file attached", async () => {
    const { agent: talent } = await createTalentAgent();
    const res = await talent.post("/api/v1/candidate-profile/resume");
    expect(res.statusCode).toBe(400);
  });

  it("accepts an upload and reports it as processing in the background", async () => {
    const { agent: talent } = await createTalentAgent();
    const res = await talent
      .post("/api/v1/candidate-profile/resume")
      .attach("cv", PDF_BUFFER, { filename: "resume.pdf", contentType: "application/pdf" });

    expect(res.statusCode).toBe(202);
    expect(res.body.msg).toMatch(/background/i);
  });

  it("forbids an employer from uploading a standalone resume", async () => {
    const { agent: employer } = await createEmployerAgent();
    const res = await employer
      .post("/api/v1/candidate-profile/resume")
      .attach("cv", PDF_BUFFER, { filename: "resume.pdf", contentType: "application/pdf" });
    expect(res.statusCode).toBe(403);
  });
});

describe("GET /api/v1/candidate-profile/matches", () => {
  it("ranks open jobs by match score, best first", async () => {
    const { agent: employer } = await createEmployerAgent();
    const strongMatch = await createJob(employer, { title: "React Job", requiredSkills: ["React", "Node.js"] });
    const weakMatch = await createJob(employer, { title: "Python Job", requiredSkills: ["Python", "Django"] });

    const { agent: talent, user } = await createTalentAgent();
    await CandidateProfileModel.create({ user: user._id, skills: ["React", "Node.js"] });

    const res = await talent.get("/api/v1/candidate-profile/matches");
    expect(res.statusCode).toBe(200);
    expect(res.body.matches.length).toBeGreaterThanOrEqual(2);

    const titles = res.body.matches.map((m) => m.job.title);
    expect(titles.indexOf(strongMatch.title)).toBeLessThan(titles.indexOf(weakMatch.title));
  });

  it("filters out jobs below minScore", async () => {
    const { agent: employer } = await createEmployerAgent();
    await createJob(employer, { title: "Unrelated Job", requiredSkills: ["COBOL"] });

    const { agent: talent, user } = await createTalentAgent();
    await CandidateProfileModel.create({ user: user._id, skills: ["React"] });

    const res = await talent.get("/api/v1/candidate-profile/matches").query({ minScore: 90 });
    expect(res.statusCode).toBe(200);
    expect(res.body.matches.find((m) => m.job.title === "Unrelated Job")).toBeUndefined();
  });

  it("reports candidateProfileStatus as not_found with no profile, but still returns scored jobs", async () => {
    const { agent: employer } = await createEmployerAgent();
    await createJob(employer, { requiredSkills: ["React"] });
    const { agent: talent } = await createTalentAgent();

    const res = await talent.get("/api/v1/candidate-profile/matches");
    expect(res.statusCode).toBe(200);
    expect(res.body.candidateProfileStatus).toBe("not_found");
    expect(res.body.matches.length).toBeGreaterThanOrEqual(1);
  });

  it("forbids an employer from using the talent-only matches endpoint", async () => {
    const { agent: employer } = await createEmployerAgent();
    const res = await employer.get("/api/v1/candidate-profile/matches");
    expect(res.statusCode).toBe(403);
  });
});
