import request from "supertest";
import JobModel from "../models/JobsModel.js";
import JobProfileModel from "../models/JobProfileModel.js";
import { createEmployerAgent, createTalentAgent, validJobPayload, app } from "./helpers.js";
import { embedJobProfile } from "../services/embeddings/embeddingService.js";

const makeIndexedJob = async (employer, overrides, profile) => {
  const job = await JobModel.create({ ...validJobPayload(overrides), createdBy: employer._id });
  await JobProfileModel.create({ job: job._id, processingStatus: "completed", profileVersion: 1, ...profile });
  await embedJobProfile(job._id);
  return job;
};

describe("GET /api/v1/jobs/search/semantic", () => {
  it("returns only active indexed jobs in descending semantic-score order", async () => {
    const { user: employer } = await createEmployerAgent();
    const relevant = await makeIndexedJob(employer, { title: "Senior Frontend Engineer", description: "Build React dashboards with WebSockets for financial trading." }, { normalizedTitle: "frontend engineer", seniority: "senior", skills: ["React", "WebSockets"], requiredSkills: ["React"], domains: ["Fintech"], responsibilities: ["Build real-time financial interfaces."] });
    await makeIndexedJob(employer, { title: "Closed Python role", isClosed: true, description: "Python data science." }, { normalizedTitle: "data scientist", skills: ["Python"], domains: ["AI"], responsibilities: ["Analyze data."] });
    const { agent: talent } = await createTalentAgent();

    const res = await talent.get("/api/v1/jobs/search/semantic?q=senior React real time financial dashboards");
    expect(res.statusCode).toBe(200);
    expect(res.body.jobs).toHaveLength(1);
    expect(res.body.jobs[0].job._id).toBe(String(relevant._id));
    expect(res.body.jobs[0].semanticScore).toBeGreaterThan(0);
  });

  it("validates queries and preserves talent-only authorization", async () => {
    const { agent: talent } = await createTalentAgent();
    const invalid = await talent.get("/api/v1/jobs/search/semantic?q=x");
    expect(invalid.statusCode).toBe(400);
    const unauthenticated = await request(app).get("/api/v1/jobs/search/semantic?q=react developer");
    expect(unauthenticated.statusCode).toBe(401);
  });
});