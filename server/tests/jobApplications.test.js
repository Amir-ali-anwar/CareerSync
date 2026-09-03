import request from "supertest";
import { createEmployerAgent, createTalentAgent, createJob, app } from "./helpers.js";
import JobModal from "../models/JobsModel.js";
import JobApplicationModal from "../models/JobApplicationModel.js";
import fs from "fs";
import path from "path";

const PDF_BUFFER = Buffer.from("%PDF-1.4 fake pdf content for testing");

const applyForJob = (talentAgent, jobId, overrides = {}) => {
  let req = talentAgent
    .post(`/api/v1/jobs/applyForJob/${jobId}`)
    .attach("cv", PDF_BUFFER, { filename: "resume.pdf", contentType: "application/pdf" });
  Object.entries(overrides).forEach(([key, value]) => {
    req = req.field(key, value);
  });
  return req;
};

describe("Job Application Management", () => {
  describe("POST /api/v1/jobs/applyForJob/:id", () => {
    it("rejects an application with no CV attached", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();

      const res = await talent.post(`/api/v1/jobs/applyForJob/${job._id}`);
      expect(res.statusCode).toBe(400);
    });

    it("rejects a CV that is not PDF/DOC/DOCX", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();

      const res = await talent
        .post(`/api/v1/jobs/applyForJob/${job._id}`)
        .attach("cv", Buffer.from("not a real executable, just bytes"), {
          filename: "resume.exe",
          contentType: "application/x-msdownload",
        });
      expect(res.statusCode).toBe(400);
    });

    it("rejects a CV larger than the 5MB limit", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();

      const oversized = Buffer.alloc(6 * 1024 * 1024, "a");
      const res = await talent
        .post(`/api/v1/jobs/applyForJob/${job._id}`)
        .attach("cv", oversized, { filename: "resume.pdf", contentType: "application/pdf" });
      expect(res.statusCode).toBe(400);
    });

    it("rejects applying to a closed job", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      await employer.patch(`/api/v1/jobs/${job._id}/close`);
      const { agent: talent } = await createTalentAgent();

      const res = await applyForJob(talent, job._id);
      expect(res.statusCode).toBe(400);
    });

    it("rejects applying after the application deadline has passed", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      await JobModal.findByIdAndUpdate(job._id, {
        applicationDeadline: new Date(Date.now() - 1000),
      });
      const { agent: talent } = await createTalentAgent();

      const res = await applyForJob(talent, job._id);
      expect(res.statusCode).toBe(400);
    });

    it("accepts a valid application", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();

      const res = await applyForJob(talent, job._id, { coverLetter: "I am excited to apply." });
      expect(res.statusCode).toBe(201);
      expect(res.body.application.cv).toMatch(/^\/uploads\/cvs\//);
    });

    it("rejects a duplicate application from the same talent for the same job", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();

      await applyForJob(talent, job._id);
      const res = await applyForJob(talent, job._id);
      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toMatch(/already applied/i);
    });

    it("blocks re-application after being rejected", async () => {
      const { agent: employer, user: employerUser } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent, user: talentUser } = await createTalentAgent();

      await applyForJob(talent, job._id);
      await employer
        .patch(`/api/v1/applications/${job._id}/${talentUser._id}/status`)
        .send({ status: "rejected" });

      const res = await applyForJob(talent, job._id);
      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toMatch(/rejected/i);
    });
  });

  describe("GET /api/v1/applications/job/:jobId", () => {
    it("forbids a non-owner employer even when the job has zero applications", async () => {
      const { agent: owner } = await createEmployerAgent();
      const { agent: other } = await createEmployerAgent();
      const job = await createJob(owner);

      const res = await other.get(`/api/v1/applications/job/${job._id}`);
      expect(res.statusCode).toBe(403);
    });

    it("returns an empty list for the owner when there are no applications yet", async () => {
      const { agent: owner } = await createEmployerAgent();
      const job = await createJob(owner);

      const res = await owner.get(`/api/v1/applications/job/${job._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.applications).toEqual([]);
    });

    it("returns applications for the owner", async () => {
      const { agent: owner } = await createEmployerAgent();
      const job = await createJob(owner);
      const { agent: talent } = await createTalentAgent();
      await applyForJob(talent, job._id);

      const res = await owner.get(`/api/v1/applications/job/${job._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.applications).toHaveLength(1);
    });
  });

  describe("PATCH /api/v1/applications/:jobId/:applicantId/status", () => {
    it("rejects an invalid status value", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent, user: talentUser } = await createTalentAgent();
      await applyForJob(talent, job._id);

      const res = await employer
        .patch(`/api/v1/applications/${job._id}/${talentUser._id}/status`)
        .send({ status: "not-a-real-status" });
      expect(res.statusCode).toBe(400);
    });

    it("forbids a non-owner employer from updating status", async () => {
      const { agent: owner } = await createEmployerAgent();
      const { agent: other } = await createEmployerAgent();
      const job = await createJob(owner);
      const { agent: talent, user: talentUser } = await createTalentAgent();
      await applyForJob(talent, job._id);

      const res = await other
        .patch(`/api/v1/applications/${job._id}/${talentUser._id}/status`)
        .send({ status: "shortlisted" });
      expect(res.statusCode).toBe(403);
    });

    it("updates the status successfully", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent, user: talentUser } = await createTalentAgent();
      await applyForJob(talent, job._id);

      const res = await employer
        .patch(`/api/v1/applications/${job._id}/${talentUser._id}/status`)
        .send({ status: "shortlisted" });
      expect(res.statusCode).toBe(200);

      const application = await JobApplicationModal.findOne({ job: job._id, talent: talentUser._id });
      expect(application.status).toBe("shortlisted");
    });
  });

  describe("PATCH /api/v1/applications/:id/withdraw", () => {
    it("forbids withdrawing another talent's application", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talentA } = await createTalentAgent();
      const { agent: talentB } = await createTalentAgent();
      const applyRes = await applyForJob(talentA, job._id);
      const applicationId = applyRes.body.application._id;

      const res = await talentB.patch(`/api/v1/applications/${applicationId}/withdraw`);
      expect(res.statusCode).toBe(403);
    });

    it("allows withdrawal while pending", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();
      const applyRes = await applyForJob(talent, job._id);

      const res = await talent.patch(`/api/v1/applications/${applyRes.body.application._id}/withdraw`);
      expect(res.statusCode).toBe(200);
    });

    it("blocks withdrawal once a decision has been made", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent, user: talentUser } = await createTalentAgent();
      const applyRes = await applyForJob(talent, job._id);

      await employer
        .patch(`/api/v1/applications/${job._id}/${talentUser._id}/status`)
        .send({ status: "shortlisted" });

      const res = await talent.patch(`/api/v1/applications/${applyRes.body.application._id}/withdraw`);
      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/applications/my", () => {
    it("only returns the requesting talent's own applications", async () => {
      const { agent: employer } = await createEmployerAgent();
      const jobA = await createJob(employer, { title: "Job A" });
      const jobB = await createJob(employer, { title: "Job B" });
      const { agent: talentA } = await createTalentAgent();
      const { agent: talentB } = await createTalentAgent();

      await applyForJob(talentA, jobA._id);
      await applyForJob(talentB, jobB._id);

      const res = await talentA.get("/api/v1/applications/my");
      expect(res.statusCode).toBe(200);
      expect(res.body.TotalSubmittedApplications).toBe(1);
      expect(res.body.applications[0].job._id).toBe(jobA._id);
    });
  });

  describe("GET /api/v1/applications/:id/cv (authenticated CV access)", () => {
    // CVs are no longer served via a public static route - every access must go
    // through this ownership-checked endpoint.
    const cvDiskPath = (cvUrlPath) =>
      path.join(process.cwd(), "uploads", "cvs", path.basename(cvUrlPath));

    it("allows the applicant to download their own CV", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();
      const applyRes = await applyForJob(talent, job._id);

      const res = await talent.get(`/api/v1/applications/${applyRes.body.application._id}/cv`);
      expect(res.statusCode).toBe(200);
    });

    it("allows the owning employer to download an applicant's CV", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();
      const applyRes = await applyForJob(talent, job._id);

      const res = await employer.get(`/api/v1/applications/${applyRes.body.application._id}/cv`);
      expect(res.statusCode).toBe(200);
    });

    it("forbids an employer who does not own the job", async () => {
      const { agent: owner } = await createEmployerAgent();
      const { agent: other } = await createEmployerAgent();
      const job = await createJob(owner);
      const { agent: talent } = await createTalentAgent();
      const applyRes = await applyForJob(talent, job._id);

      const res = await other.get(`/api/v1/applications/${applyRes.body.application._id}/cv`);
      expect(res.statusCode).toBe(403);
    });

    it("forbids an unrelated talent from downloading someone else's CV", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: applicant } = await createTalentAgent();
      const { agent: unrelatedTalent } = await createTalentAgent();
      const applyRes = await applyForJob(applicant, job._id);

      const res = await unrelatedTalent.get(`/api/v1/applications/${applyRes.body.application._id}/cv`);
      expect(res.statusCode).toBe(403);
    });

    it("rejects an unauthenticated request", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();
      const applyRes = await applyForJob(talent, job._id);

      const res = await request(app).get(`/api/v1/applications/${applyRes.body.application._id}/cv`);
      expect(res.statusCode).toBe(401);
    });

    it("returns 404 for a nonexistent application", async () => {
      const { agent: talent } = await createTalentAgent();
      const res = await talent.get("/api/v1/applications/64b7f3f3f3f3f3f3f3f3f3f3/cv");
      expect(res.statusCode).toBe(404);
    });

    it("returns 400 for a malformed application id (no raw 500 leak)", async () => {
      const { agent: talent } = await createTalentAgent();
      const res = await talent.get("/api/v1/applications/not-a-valid-id/cv");
      expect(res.statusCode).toBe(400);
    });

    it("returns 404 when the CV record exists but the underlying file is gone", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();
      const applyRes = await applyForJob(talent, job._id);

      fs.unlinkSync(cvDiskPath(applyRes.body.application.cv));

      const res = await talent.get(`/api/v1/applications/${applyRes.body.application._id}/cv`);
      expect(res.statusCode).toBe(404);
    });
  });
});
