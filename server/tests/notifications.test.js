import request from "supertest";
import { createEmployerAgent, createTalentAgent, createJob, app } from "./helpers.js";

const PDF_BUFFER = Buffer.from("%PDF-1.4 fake pdf content for testing");

const applyForJob = (talentAgent, jobId) =>
  talentAgent
    .post(`/api/v1/jobs/applyForJob/${jobId}`)
    .attach("cv", PDF_BUFFER, { filename: "resume.pdf", contentType: "application/pdf" });

describe("Notifications", () => {
  describe("application lifecycle triggers", () => {
    it("notifies the employer when a talent applies for their job", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();

      await applyForJob(talent, job._id);

      const res = await employer.get("/api/v1/notifications");
      expect(res.statusCode).toBe(200);
      expect(res.body.unreadCount).toBe(1);
      expect(res.body.notifications).toHaveLength(1);
      expect(res.body.notifications[0]).toMatchObject({
        type: "application_submitted",
        read: false,
      });
      expect(res.body.notifications[0].message).toContain(job.title);
    });

    it("notifies the talent when their application status changes", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent, user: talentUser } = await createTalentAgent();

      await applyForJob(talent, job._id);
      await employer
        .patch(`/api/v1/applications/${job._id}/${talentUser._id}/status`)
        .send({ status: "shortlisted" });

      const res = await talent.get("/api/v1/notifications");
      expect(res.statusCode).toBe(200);
      expect(res.body.unreadCount).toBe(1);
      expect(res.body.notifications[0]).toMatchObject({
        type: "application_status_changed",
        read: false,
      });
      expect(res.body.notifications[0].message).toContain("shortlisted");

      // The employer's own "new applicant" notification is a separate document -
      // the talent's list must never include it.
      const employerNotifications = await employer.get("/api/v1/notifications");
      expect(employerNotifications.body.notifications).toHaveLength(1);
      expect(employerNotifications.body.notifications[0].type).toBe("application_submitted");
    });
  });

  describe("GET /api/v1/notifications", () => {
    it("requires authentication", async () => {
      const res = await request(app).get("/api/v1/notifications");
      expect(res.statusCode).toBe(401);
    });

    it("paginates and never leaks another user's notifications", async () => {
      const { agent: employerA } = await createEmployerAgent();
      const jobA = await createJob(employerA);
      const { agent: employerB } = await createEmployerAgent();
      const jobB = await createJob(employerB);
      const { agent: talent } = await createTalentAgent();

      await applyForJob(talent, jobA._id);
      await applyForJob(talent, jobB._id);

      const resA = await employerA.get("/api/v1/notifications");
      expect(resA.body.notifications).toHaveLength(1);
      expect(resA.body.notifications[0]).toMatchObject({ type: "application_submitted" });

      const resB = await employerB.get("/api/v1/notifications");
      expect(resB.body.notifications).toHaveLength(1);
    });
  });

  describe("PATCH /api/v1/notifications/:id/read", () => {
    it("marks a single notification as read and decrements the unread count", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();
      await applyForJob(talent, job._id);

      const list = await employer.get("/api/v1/notifications");
      const notificationId = list.body.notifications[0]._id;

      const res = await employer.patch(`/api/v1/notifications/${notificationId}/read`);
      expect(res.statusCode).toBe(200);
      expect(res.body.notification.read).toBe(true);

      const after = await employer.get("/api/v1/notifications");
      expect(after.body.unreadCount).toBe(0);
    });

    it("404s when marking a notification that belongs to another user", async () => {
      const { agent: employer } = await createEmployerAgent();
      const job = await createJob(employer);
      const { agent: talent } = await createTalentAgent();
      await applyForJob(talent, job._id);

      const list = await employer.get("/api/v1/notifications");
      const notificationId = list.body.notifications[0]._id;

      const { agent: otherEmployer } = await createEmployerAgent();
      const res = await otherEmployer.patch(`/api/v1/notifications/${notificationId}/read`);
      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /api/v1/notifications/read-all", () => {
    it("marks every notification as read", async () => {
      const { agent: employer } = await createEmployerAgent();
      const jobOne = await createJob(employer);
      const jobTwo = await createJob(employer);
      const { agent: talent } = await createTalentAgent();

      await applyForJob(talent, jobOne._id);
      await applyForJob(talent, jobTwo._id);

      const beforeRes = await employer.get("/api/v1/notifications");
      expect(beforeRes.body.unreadCount).toBe(2);

      const res = await employer.patch("/api/v1/notifications/read-all");
      expect(res.statusCode).toBe(200);

      const afterRes = await employer.get("/api/v1/notifications");
      expect(afterRes.body.unreadCount).toBe(0);
      expect(afterRes.body.notifications.every((n) => n.read)).toBe(true);
    });
  });
});
