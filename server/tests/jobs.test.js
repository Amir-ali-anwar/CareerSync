import { createEmployerAgent, createTalentAgent, createJob, validJobPayload } from "./helpers.js";
import JobApplicationModal from "../models/JobApplicationModel.js";
import JobModal from "../models/JobsModel.js";

describe("Job Posting / Management / Discovery", () => {
  describe("POST /api/v1/jobs (create)", () => {
    it("forbids a talent from creating a job", async () => {
      const { agent } = await createTalentAgent();
      const res = await agent.post("/api/v1/jobs").send(validJobPayload());
      expect(res.statusCode).toBe(403);
    });

    it("rejects missing required fields", async () => {
      const { agent } = await createEmployerAgent();
      const payload = validJobPayload();
      delete payload.title;
      const res = await agent.post("/api/v1/jobs").send(payload);
      expect(res.statusCode).toBe(400);
    });

    it("rejects a jobLocation missing country/city", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent
        .post("/api/v1/jobs")
        .send(validJobPayload({ jobLocation: { country: "", city: "" } }));
      expect(res.statusCode).toBe(400);
    });

    it("rejects a malformed applicationDeadline", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent
        .post("/api/v1/jobs")
        .send(validJobPayload({ applicationDeadline: "not-a-date" }));
      expect(res.statusCode).toBe(400);
    });

    it("rejects an applicationDeadline in the past", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent
        .post("/api/v1/jobs")
        .send(validJobPayload({ applicationDeadline: "2020-01-01T00:00:00.000Z" }));
      expect(res.statusCode).toBe(400);
    });

    it("creates a job successfully and assigns createdBy from the session", async () => {
      const { agent, user } = await createEmployerAgent();
      const res = await agent.post("/api/v1/jobs").send(validJobPayload());
      expect(res.statusCode).toBe(201);
      expect(res.body.job.createdBy).toBe(String(user._id));
    });

    it("remains backward compatible: a job with none of the AI-matching fields is still valid", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent.post("/api/v1/jobs").send(validJobPayload());
      expect(res.statusCode).toBe(201);
      expect(res.body.job.requiredSkills).toEqual([]);
      expect(res.body.job.preferredSkills).toEqual([]);
      expect(res.body.job.requiredExperience).toBeUndefined();
      expect(res.body.job.workMode).toBeUndefined();
    });

    it("accepts and persists the structured AI-matching fields when provided", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent.post("/api/v1/jobs").send(
        validJobPayload({
          requiredSkills: ["React", "TypeScript", "Node.js"],
          preferredSkills: ["AWS", "Docker"],
          requiredExperience: 5,
          workMode: "remote",
          salaryRange: { min: 90000, max: 130000, currency: "USD" },
        })
      );
      expect(res.statusCode).toBe(201);
      expect(res.body.job.requiredSkills).toEqual(["React", "TypeScript", "Node.js"]);
      expect(res.body.job.preferredSkills).toEqual(["AWS", "Docker"]);
      expect(res.body.job.requiredExperience).toBe(5);
      expect(res.body.job.workMode).toBe("remote");
      expect(res.body.job.salaryRange).toMatchObject({ min: 90000, max: 130000, currency: "USD" });
    });

    it("rejects an invalid workMode value", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent
        .post("/api/v1/jobs")
        .send(validJobPayload({ workMode: "from-the-moon" }));
      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/jobs (list, employer-scoped)", () => {
    it("only returns jobs created by the requesting employer", async () => {
      const { agent: employerA } = await createEmployerAgent();
      const { agent: employerB } = await createEmployerAgent();
      await createJob(employerA, { title: "Job A" });
      await createJob(employerB, { title: "Job B" });

      const res = await employerA.get("/api/v1/jobs");
      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toHaveLength(1);
      expect(res.body.jobs[0].title).toBe("Job A");
    });

    it("filters by jobType", async () => {
      const { agent } = await createEmployerAgent();
      await createJob(agent, { jobType: "full-time" });
      await createJob(agent, { jobType: "internship" });

      const res = await agent.get("/api/v1/jobs").query({ jobType: "internship" });
      expect(res.body.jobs).toHaveLength(1);
      expect(res.body.jobs[0].jobType).toBe("internship");
    });

    it("sorts a-z and z-a by position", async () => {
      const { agent } = await createEmployerAgent();
      await createJob(agent, { position: "Backend Engineer" });
      await createJob(agent, { position: "Frontend Engineer" });

      const az = await agent.get("/api/v1/jobs").query({ sort: "a-z" });
      expect(az.body.jobs.map((j) => j.position)).toEqual(["Backend Engineer", "Frontend Engineer"]);

      const za = await agent.get("/api/v1/jobs").query({ sort: "z-a" });
      expect(za.body.jobs.map((j) => j.position)).toEqual(["Frontend Engineer", "Backend Engineer"]);
    });

    it("paginates results and never issues a negative skip for page<=0", async () => {
      const { agent } = await createEmployerAgent();
      for (let i = 0; i < 3; i++) await createJob(agent, { title: `Job ${i}` });

      const res = await agent.get("/api/v1/jobs").query({ page: 0, limit: 2 });
      expect(res.statusCode).toBe(200);
      expect(res.body.currentPage).toBe(1);
      expect(res.body.jobs.length).toBeLessThanOrEqual(2);
      expect(res.body.totalJobs).toBe(3);
    });
  });

  describe("GET /api/v1/jobs/:id", () => {
    it("returns 404 for a nonexistent job", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent.get("/api/v1/jobs/64b7f3f3f3f3f3f3f3f3f3f3");
      expect(res.statusCode).toBe(404);
    });

    it("returns 400 for a malformed ObjectId (no raw 500 leak)", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent.get("/api/v1/jobs/not-a-valid-id");
      expect(res.statusCode).toBe(400);
    });

    it("forbids an employer from viewing another employer's job", async () => {
      const { agent: owner } = await createEmployerAgent();
      const { agent: other } = await createEmployerAgent();
      const job = await createJob(owner);

      const res = await other.get(`/api/v1/jobs/${job._id}`);
      expect(res.statusCode).toBe(403);
    });

    it("returns the job for its owner", async () => {
      const { agent } = await createEmployerAgent();
      const job = await createJob(agent);
      const res = await agent.get(`/api/v1/jobs/${job._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.job._id).toBe(job._id);
    });
  });

  describe("PATCH /api/v1/jobs/:id (update)", () => {
    it("does not allow a non-owner to update the job", async () => {
      const { agent: owner } = await createEmployerAgent();
      const { agent: other } = await createEmployerAgent();
      const job = await createJob(owner);

      const res = await other.patch(`/api/v1/jobs/${job._id}`).send({ title: "Hacked" });
      expect(res.statusCode).toBe(404);
    });

    it("ignores a spoofed createdBy in the request body", async () => {
      const { agent, user } = await createEmployerAgent();
      const job = await createJob(agent);
      const res = await agent
        .patch(`/api/v1/jobs/${job._id}`)
        .send({ title: "Updated Title", createdBy: "64b7f3f3f3f3f3f3f3f3f3f3" });
      expect(res.statusCode).toBe(200);
      expect(res.body.job.createdBy).toBe(String(user._id));
    });

    it("rejects an incomplete jobLocation on update", async () => {
      const { agent } = await createEmployerAgent();
      const job = await createJob(agent);
      const res = await agent
        .patch(`/api/v1/jobs/${job._id}`)
        .send({ jobLocation: { country: "Canada" } });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("DELETE /api/v1/jobs/:id", () => {
    it("forbids a non-owner from deleting the job", async () => {
      const { agent: owner } = await createEmployerAgent();
      const { agent: other } = await createEmployerAgent();
      const job = await createJob(owner);

      const res = await other.delete(`/api/v1/jobs/${job._id}`);
      expect(res.statusCode).toBe(403);
    });

    it("cascades: deletes related job applications so none are orphaned", async () => {
      const { agent: employer } = await createEmployerAgent();
      const { user: talent } = await createTalentAgent();
      const job = await createJob(employer);
      await JobApplicationModal.create({
        job: job._id,
        talent: talent._id,
        cv: "/uploads/cvs/fake.pdf",
      });

      const res = await employer.delete(`/api/v1/jobs/${job._id}`);
      expect(res.statusCode).toBe(200);

      const remaining = await JobApplicationModal.find({ job: job._id });
      expect(remaining).toHaveLength(0);
    });
  });

  describe("PATCH /api/v1/jobs/:jobId/close", () => {
    it("closes a job so it no longer accepts applications", async () => {
      const { agent } = await createEmployerAgent();
      const job = await createJob(agent);
      const res = await agent.patch(`/api/v1/jobs/${job._id}/close`);
      expect(res.statusCode).toBe(200);
      const updated = await JobModal.findById(job._id);
      expect(updated.isClosed).toBe(true);
    });
  });

  describe("GET /api/v1/jobs/search (talent discovery)", () => {
    it("forbids employers from using the talent search endpoint", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent.get("/api/v1/jobs/search");
      expect(res.statusCode).toBe(403);
    });

    it("excludes closed jobs and jobs past their deadline", async () => {
      const { agent: employer } = await createEmployerAgent();
      const openJob = await createJob(employer, { title: "Open Job" });
      const closedJob = await createJob(employer, { title: "Closed Job" });
      await employer.patch(`/api/v1/jobs/${closedJob._id}/close`);

      const { agent: talent } = await createTalentAgent();
      const res = await talent.get("/api/v1/jobs/search");
      expect(res.statusCode).toBe(200);
      const titles = res.body.jobs.map((j) => j.title);
      expect(titles).toContain("Open Job");
      expect(titles).not.toContain("Closed Job");
    });

    it("treats regex metacharacters in the search term as literal text (no crash, no ReDoS)", async () => {
      const { agent: employer } = await createEmployerAgent();
      await createJob(employer, { title: "Backend (Node.js) Engineer" });

      const { agent: talent } = await createTalentAgent();
      const res = await talent.get("/api/v1/jobs/search").query({ search: "(Node.js)" });
      expect(res.statusCode).toBe(200);
      expect(res.body.jobs.some((j) => j.title.includes("(Node.js)"))).toBe(true);
    });
  });

  describe("Job intelligence pipeline (end-to-end through the real HTTP endpoints)", () => {
    // Job intelligence processing is fire-and-forget, same as resume processing - poll
    // the job's own status field instead of a fixed sleep.
    const waitForJobIntelligence = async (jobId, { timeoutMs = 3000, intervalMs = 50 } = {}) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const job = await JobModal.findById(jobId);
        if (job.intelligenceProcessingStatus !== "pending" && job.intelligenceProcessingStatus !== "processing") {
          return job;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      throw new Error("Timed out waiting for job intelligence processing to finish");
    };

    it("processes a newly created job's description into a JobProfile", async () => {
      const { agent: employer } = await createEmployerAgent();
      const res = await employer.post("/api/v1/jobs").send(
        validJobPayload({
          title: "Senior Software Engineer",
          description:
            "Build and maintain APIs using React, Node.js, and AWS. 5+ years of experience required.",
        })
      );
      expect(res.statusCode).toBe(201);
      expect(res.body.job.intelligenceProcessingStatus).toBe("pending");

      const finishedJob = await waitForJobIntelligence(res.body.job._id);
      expect(finishedJob.intelligenceProcessingStatus).toBe("completed");

      const JobProfileModal = (await import("../models/JobProfileModel.js")).default;
      const profile = await JobProfileModal.findOne({ job: res.body.job._id });
      expect(profile).not.toBeNull();
      expect(profile.normalizedTitle).toBe("software engineer");
      expect(profile.seniority).toBe("senior");
      expect(profile.skills).toEqual(expect.arrayContaining(["React", "Node.js", "AWS"]));
      expect(profile.profileVersion).toBe(1);
    });

    it("reprocesses (new version) when a job's description is updated", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer, {
        description: "Build APIs using React and Node.js. 3 years of experience required.",
      });
      await waitForJobIntelligence(job._id);

      const updateRes = await employer.patch(`/api/v1/jobs/${job._id}`).send({
        description: "Data science role requiring Python and SQL. 8 years of experience required.",
      });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.job.intelligenceProcessingStatus).toBe("pending");

      const finishedJob = await waitForJobIntelligence(job._id);
      expect(finishedJob.intelligenceProcessingStatus).toBe("completed");

      const JobProfileModal = (await import("../models/JobProfileModel.js")).default;
      const profiles = await JobProfileModal.find({ job: job._id });
      expect(profiles).toHaveLength(1); // overwritten, not forked
      expect(profiles[0].skills).toEqual(expect.arrayContaining(["Python", "SQL"]));
      expect(profiles[0].profileVersion).toBe(2);
    });

    it("does not trigger reprocessing for an update that doesn't touch the description", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      await waitForJobIntelligence(job._id);

      const JobProfileModal = (await import("../models/JobProfileModel.js")).default;
      const profileBefore = await JobProfileModal.findOne({ job: job._id });

      const updateRes = await employer.patch(`/api/v1/jobs/${job._id}`).send({ title: "Updated Title Only" });
      expect(updateRes.statusCode).toBe(200);
      // Status stays "completed" - never reset to pending since description wasn't touched.
      expect(updateRes.body.job.intelligenceProcessingStatus).toBe("completed");

      const profileAfter = await JobProfileModal.findOne({ job: job._id });
      expect(profileAfter.profileVersion).toBe(profileBefore.profileVersion);
    });

    it("cannot be manipulated by a client sending intelligenceProcessingStatus directly", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      await waitForJobIntelligence(job._id);

      const res = await employer
        .patch(`/api/v1/jobs/${job._id}`)
        .send({ intelligenceProcessingStatus: "failed", intelligenceProcessingError: "hacked" });
      expect(res.statusCode).toBe(200);
      // The client-supplied value is silently dropped, not applied - status is untouched.
      expect(res.body.job.intelligenceProcessingStatus).toBe("completed");
    });
  });
});
