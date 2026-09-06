import request from "supertest";
import {
  app,
  createEmployerAgent,
  createTalentAgent,
  createOrganization,
  validOrganizationPayload,
} from "./helpers.js";
import OrganizationModal from "../models/OrganizationModel.js";

describe("Organization Profiles", () => {
  describe("POST /api/v1/organization (create)", () => {
    it("creates an organization successfully as an employer", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent.post("/api/v1/organization").send(validOrganizationPayload());
      expect(res.statusCode).toBe(201);
      expect(res.body.newOrganization.name).toBe("Tech Innovations Inc");
      expect(res.body.newOrganization.hqLocation).toBe("San Francisco, United States");
    });

    it("forbids a talent from creating an organization", async () => {
      const { agent } = await createTalentAgent();
      const res = await agent.post("/api/v1/organization").send(validOrganizationPayload());
      expect(res.statusCode).toBe(403);
    });

    it("rejects an unauthenticated request", async () => {
      const res = await request(app).post("/api/v1/organization").send(validOrganizationPayload());
      expect(res.statusCode).toBe(401);
    });

    it("rejects missing required fields", async () => {
      const { agent } = await createEmployerAgent();
      const payload = validOrganizationPayload();
      delete payload.description;
      const res = await agent.post("/api/v1/organization").send(payload);
      expect(res.statusCode).toBe(400);
    });

    it("rejects an invalid website URL", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent
        .post("/api/v1/organization")
        .send(validOrganizationPayload({ website: "not-a-url" }));
      expect(res.statusCode).toBe(400);
    });

    it("rejects an invalid social link URL", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent
        .post("/api/v1/organization")
        .send(validOrganizationPayload({ socialLinks: { linkedin: "not-a-url" } }));
      expect(res.statusCode).toBe(400);
    });

    it("enforces MAX_ORGS_PER_USER (4 organizations per employer)", async () => {
      const { agent } = await createEmployerAgent();
      for (let i = 0; i < 4; i++) {
        const res = await agent
          .post("/api/v1/organization")
          .send(validOrganizationPayload({ name: `Org ${i}`, emailDomain: `org${i}.com` }));
        expect(res.statusCode).toBe(201);
      }
      const fifth = await agent
        .post("/api/v1/organization")
        .send(validOrganizationPayload({ name: "Org 5", emailDomain: "org5.com" }));
      expect(fifth.statusCode).toBe(403);
    });
  });

  describe("GET /api/v1/organization (list, employer-scoped)", () => {
    it("only returns organizations created by the requesting employer", async () => {
      const { agent: employerA } = await createEmployerAgent();
      const { agent: employerB } = await createEmployerAgent();
      await createOrganization(employerA, { name: "Org A", emailDomain: "orga.com" });
      await createOrganization(employerB, { name: "Org B", emailDomain: "orgb.com" });

      const res = await employerA.get("/api/v1/organization");
      expect(res.statusCode).toBe(200);
      expect(res.body.OrganizationCount).toBe(1);
      expect(res.body.organizationListing[0].name).toBe("Org A");
    });

    it("returns an empty list for an employer with no organizations", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent.get("/api/v1/organization");
      expect(res.statusCode).toBe(200);
      expect(res.body.organizationListing).toEqual([]);
      expect(res.body.OrganizationCount).toBe(0);
    });

    it("rejects an unauthenticated request", async () => {
      const res = await request(app).get("/api/v1/organization");
      expect(res.statusCode).toBe(401);
    });
  });

  describe("PATCH /api/v1/organization/:id (update)", () => {
    it("updates an organization owned by the requester", async () => {
      const { agent } = await createEmployerAgent();
      const org = await createOrganization(agent);
      const res = await agent
        .patch(`/api/v1/organization/${org._id}`)
        .send({ description: "Updated description" });
      expect(res.statusCode).toBe(200);
      expect(res.body.organization.description).toBe("Updated description");
    });

    it("ignores a spoofed createdBy in the request body", async () => {
      const { agent, user } = await createEmployerAgent();
      const org = await createOrganization(agent);
      const res = await agent
        .patch(`/api/v1/organization/${org._id}`)
        .send({ description: "Updated", createdBy: "64b7f3f3f3f3f3f3f3f3f3f3" });
      expect(res.statusCode).toBe(200);
      expect(res.body.organization.createdBy).toBe(String(user._id));
    });

    it("returns 404 for a nonexistent organization", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent
        .patch("/api/v1/organization/64b7f3f3f3f3f3f3f3f3f3f3")
        .send({ description: "x" });
      expect(res.statusCode).toBe(404);
    });

    it("forbids a non-owner employer from updating the organization (IDOR)", async () => {
      const { agent: owner } = await createEmployerAgent();
      const { agent: other } = await createEmployerAgent();
      const org = await createOrganization(owner);

      const res = await other
        .patch(`/api/v1/organization/${org._id}`)
        .send({ description: "Hacked" });
      expect(res.statusCode).toBe(403);
    });
  });

  describe("DELETE /api/v1/organization/:id", () => {
    it("deletes an organization owned by the requester", async () => {
      const { agent } = await createEmployerAgent();
      const org = await createOrganization(agent);
      const res = await agent.delete(`/api/v1/organization/${org._id}`);
      expect(res.statusCode).toBe(200);
      expect(await OrganizationModal.findById(org._id)).toBeNull();
    });

    it("returns 404 for a nonexistent organization", async () => {
      const { agent } = await createEmployerAgent();
      const res = await agent.delete("/api/v1/organization/64b7f3f3f3f3f3f3f3f3f3f3");
      expect(res.statusCode).toBe(404);
    });

    it("forbids a non-owner employer from deleting the organization (IDOR)", async () => {
      const { agent: owner } = await createEmployerAgent();
      const { agent: other } = await createEmployerAgent();
      const org = await createOrganization(owner);

      const res = await other.delete(`/api/v1/organization/${org._id}`);
      expect(res.statusCode).toBe(403);
      expect(await OrganizationModal.findById(org._id)).not.toBeNull();
    });
  });

  describe("POST /api/v1/organization/:id/follow", () => {
    it("allows a talent to follow an organization", async () => {
      const { agent: employer } = await createEmployerAgent();
      const org = await createOrganization(employer);
      const { agent: talent } = await createTalentAgent();

      const res = await talent.post(`/api/v1/organization/${org._id}/follow`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/now following/i);
    });

    it("returns a distinct message on a duplicate follow instead of erroring", async () => {
      const { agent: employer } = await createEmployerAgent();
      const org = await createOrganization(employer);
      const { agent: talent } = await createTalentAgent();

      await talent.post(`/api/v1/organization/${org._id}/follow`);
      const res = await talent.post(`/api/v1/organization/${org._id}/follow`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/already following/i);
    });

    it("forbids an employer from using the follow endpoint", async () => {
      const { agent: employer } = await createEmployerAgent();
      const org = await createOrganization(employer);
      const { agent: otherEmployer } = await createEmployerAgent();

      const res = await otherEmployer.post(`/api/v1/organization/${org._id}/follow`);
      expect(res.statusCode).toBe(403);
    });

    it("returns 404 when following a nonexistent organization", async () => {
      const { agent: talent } = await createTalentAgent();
      const res = await talent.post("/api/v1/organization/64b7f3f3f3f3f3f3f3f3f3f3/follow");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /api/v1/organization/:id/is-following", () => {
    it("reports false before following", async () => {
      const { agent: employer } = await createEmployerAgent();
      const org = await createOrganization(employer);
      const { agent: talent } = await createTalentAgent();

      const res = await talent.get(`/api/v1/organization/${org._id}/is-following`);
      expect(res.statusCode).toBe(200);
      expect(res.body.isFollowing).toBeFalsy();
    });

    it("reports true after following", async () => {
      const { agent: employer } = await createEmployerAgent();
      const org = await createOrganization(employer);
      const { agent: talent } = await createTalentAgent();

      await talent.post(`/api/v1/organization/${org._id}/follow`);
      const res = await talent.get(`/api/v1/organization/${org._id}/is-following`);
      expect(res.statusCode).toBe(200);
      expect(res.body.isFollowing).toBe(true);
    });
  });

  describe("GET /api/v1/organization/:id/followers (employer management view)", () => {
    it("allows the owning employer to view followers", async () => {
      const { agent: employer } = await createEmployerAgent();
      const org = await createOrganization(employer);
      const { agent: talent } = await createTalentAgent();
      await talent.post(`/api/v1/organization/${org._id}/follow`);

      const res = await employer.get(`/api/v1/organization/${org._id}/followers`);
      expect(res.statusCode).toBe(200);
      expect(res.body.followers).toHaveLength(1);
    });

    it("IDOR regression: forbids a non-owner employer from viewing another org's followers", async () => {
      const { agent: owner } = await createEmployerAgent();
      const { agent: other } = await createEmployerAgent();
      const org = await createOrganization(owner);
      const { agent: talent } = await createTalentAgent();
      await talent.post(`/api/v1/organization/${org._id}/follow`);

      const res = await other.get(`/api/v1/organization/${org._id}/followers`);
      expect(res.statusCode).toBe(403);
    });

    it("returns 404 for a nonexistent organization", async () => {
      const { agent: employer } = await createEmployerAgent();
      const res = await employer.get("/api/v1/organization/64b7f3f3f3f3f3f3f3f3f3f3/followers");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("Public organization endpoints (no auth required)", () => {
    it("lists all public organizations", async () => {
      const { agent: employer } = await createEmployerAgent();
      await createOrganization(employer);

      const res = await request(app).get("/api/v1/organization/public");
      expect(res.statusCode).toBe(200);
      expect(res.body.TotalOrganizations).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.allOrganizations)).toBe(true);
    });

    it("returns a single public organization by id", async () => {
      const { agent: employer } = await createEmployerAgent();
      const org = await createOrganization(employer);

      const res = await request(app).get(`/api/v1/organization/public/${org._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.organization._id).toBe(org._id);
    });

    it("returns 404 (not 200-with-null) for a nonexistent public organization", async () => {
      const res = await request(app).get(
        "/api/v1/organization/public/64b7f3f3f3f3f3f3f3f3f3f3"
      );
      expect(res.statusCode).toBe(404);
    });

    it("returns 400 for a malformed organization id (no raw 500 leak)", async () => {
      const res = await request(app).get("/api/v1/organization/public/not-a-valid-id");
      expect(res.statusCode).toBe(400);
    });

    it("returns the follower count for a public organization", async () => {
      const { agent: employer } = await createEmployerAgent();
      const org = await createOrganization(employer);
      const { agent: talent } = await createTalentAgent();
      await talent.post(`/api/v1/organization/${org._id}/follow`);

      const res = await request(app).get(
        `/api/v1/organization/public-organizations/${org._id}/followers/count`
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.organization.followers).toHaveLength(1);
    });

    it("returns 404 for the follower count of a nonexistent organization", async () => {
      const res = await request(app).get(
        "/api/v1/organization/public-organizations/64b7f3f3f3f3f3f3f3f3f3f3/followers/count"
      );
      expect(res.statusCode).toBe(404);
    });
  });
});
