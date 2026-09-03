import { createEmployerAgent, createTalentAgent, createJob } from "./helpers.js";

const PDF_BUFFER = Buffer.from("%PDF-1.4 fake pdf content for testing");

const applyForJob = (talentAgent, jobId) =>
  talentAgent
    .post(`/api/v1/jobs/applyForJob/${jobId}`)
    .attach("cv", PDF_BUFFER, { filename: "resume.pdf", contentType: "application/pdf" });

describe("Candidate Management", () => {
  describe("GET /api/v1/talents (getAllTalents)", () => {
    it("only returns applicants for the requesting employer's own jobs", async () => {
      const { agent: employerA } = await createEmployerAgent();
      const { agent: employerB } = await createEmployerAgent();
      const jobA = await createJob(employerA, { title: "Job A" });
      const jobB = await createJob(employerB, { title: "Job B" });
      const { agent: talentA } = await createTalentAgent();
      const { agent: talentB } = await createTalentAgent();

      await applyForJob(talentA, jobA._id);
      await applyForJob(talentB, jobB._id);

      const res = await employerA.get("/api/v1/talents");
      expect(res.statusCode).toBe(200);
      expect(res.body.applications).toHaveLength(1);
      expect(res.body.applications[0].job.title).toBe("Job A");
      // populated, not a bare ObjectId
      expect(res.body.applications[0].talent.name).toBeDefined();
    });

    it("paginates results", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      for (let i = 0; i < 3; i++) {
        const { agent: talent } = await createTalentAgent();
        await applyForJob(talent, job._id);
      }

      const res = await employer.get("/api/v1/talents").query({ page: 1, limit: 2 });
      expect(res.statusCode).toBe(200);
      expect(res.body.applications).toHaveLength(2);
      expect(res.body.totalApplications).toBe(3);
      expect(res.body.numOfPages).toBe(2);
    });
  });

  describe("GET /api/v1/talents/:talentId (IDOR regression)", () => {
    it("blocks an employer from viewing a talent who never applied to their jobs", async () => {
      const { agent: employerA } = await createEmployerAgent();
      const { agent: employerB } = await createEmployerAgent();
      const jobB = await createJob(employerB);
      const { agent: talent, user: talentUser } = await createTalentAgent();
      await applyForJob(talent, jobB._id);

      // employerA has no jobs this talent applied to - must not be able to fetch the talent's data.
      const res = await employerA.get(`/api/v1/talents/${talentUser._id}`);
      expect(res.statusCode).toBe(404);
    });

    it("allows an employer to view a talent who applied to their own job", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent, user: talentUser } = await createTalentAgent();
      await applyForJob(talent, job._id);

      const res = await employer.get(`/api/v1/talents/${talentUser._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.talent).toHaveLength(1);
      expect(res.body.talent[0].talent.name).toBeDefined();
    });
  });

  describe("GET /api/v1/talents/export-applications", () => {
    it("returns a CSV file with the expected columns", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();
      await applyForJob(talent, job._id);

      const res = await employer.get("/api/v1/talents/export-applications");
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/csv/);
      expect(res.headers["content-disposition"]).toMatch(/attachment; filename=job-applications\.csv/);
      const header = res.text.split("\n")[0];
      ["talentName", "talentEmail", "talentPhone", "jobTitle", "jobPosition", "jobCompany", "status", "createdAt"].forEach(
        (column) => expect(header).toContain(column)
      );
    });
  });
});
