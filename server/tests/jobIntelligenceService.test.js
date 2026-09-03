import { createEmployerAgent, validJobPayload } from "./helpers.js";
import JobModel from "../models/JobsModel.js";
import JobProfileModel from "../models/JobProfileModel.js";

// Wraps the REAL aiService (real fake-provider-backed extraction) so most tests exercise
// genuine fake-provider behavior, while the failure tests below can override it with
// mockRejectedValueOnce - same pattern as tests/resumeProcessingService.test.js.
jest.mock("../services/ai/index.js", () => {
  const actual = jest.requireActual("../services/ai/index.js");
  return {
    __esModule: true,
    default: {
      ...actual.default,
      extractJobProfile: jest.fn(actual.default.extractJobProfile.bind(actual.default)),
    },
  };
});
import aiService from "../services/ai/index.js";

import {
  processJobIntelligence,
  hashDescription,
} from "../services/job/jobIntelligenceService.js";

const REALISTIC_DESCRIPTION =
  "We are looking for an engineer to build and maintain APIs using React, Node.js, and AWS. " +
  "5+ years of experience required. Bachelor's degree preferred. Fintech domain.";

const createJobDirect = async (overrides = {}) => {
  const { agent: employer, user: employerUser } = await createEmployerAgent();
  const job = await JobModel.create({
    ...validJobPayload({ description: REALISTIC_DESCRIPTION, ...overrides }),
    createdBy: employerUser._id,
    intelligenceProcessingStatus: "pending",
  });
  return { job, employer, employerUser };
};

describe("jobIntelligenceService.processJobIntelligence", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("successful flow", () => {
    it("extracts a realistic job profile and persists it to a new JobProfile", async () => {
      const { job } = await createJobDirect({ title: "Senior Software Engineer" });

      const result = await processJobIntelligence(job._id);
      expect(result.status).toBe("completed");

      const profile = await JobProfileModel.findOne({ job: job._id });
      expect(profile).not.toBeNull();
      expect(profile.normalizedTitle).toBe("software engineer");
      expect(profile.seniority).toBe("senior");
      expect(profile.skills).toEqual(expect.arrayContaining(["React", "Node.js", "AWS"]));
      expect(profile.yearsOfExperience).toBe(5);
      expect(profile.education).toEqual(["Bachelor's"]);
      expect(profile.domains).toEqual(expect.arrayContaining(["Fintech"]));
      expect(profile.processingStatus).toBe("completed");
      expect(profile.profileVersion).toBe(1);
      expect(profile.sourceDescriptionHash).toBe(hashDescription(REALISTIC_DESCRIPTION));

      const updatedJob = await JobModel.findById(job._id);
      expect(updatedJob.intelligenceProcessingStatus).toBe("completed");
    });
  });

  describe("idempotency", () => {
    it("does not reprocess once a job is already completed", async () => {
      const { job } = await createJobDirect();

      const first = await processJobIntelligence(job._id);
      expect(first.status).toBe("completed");
      expect(aiService.extractJobProfile).toHaveBeenCalledTimes(1);

      const second = await processJobIntelligence(job._id);
      expect(second.status).toBe("skipped");
      expect(aiService.extractJobProfile).toHaveBeenCalledTimes(1); // not called again

      const profiles = await JobProfileModel.find({ job: job._id });
      expect(profiles).toHaveLength(1); // never duplicated
    });

    it("reprocesses (new version, same document) once intelligenceProcessingStatus is reset to pending", async () => {
      const { job } = await createJobDirect();
      await processJobIntelligence(job._id);

      // Simulates what updateJob does when `description` changes.
      const newDescription =
        "Looking for a data scientist skilled in Python and SQL with 8 years of experience. PhD preferred.";
      await JobModel.findByIdAndUpdate(job._id, {
        $set: { description: newDescription, intelligenceProcessingStatus: "pending" },
      });

      const second = await processJobIntelligence(job._id);
      expect(second.status).toBe("completed");

      const profiles = await JobProfileModel.find({ job: job._id });
      expect(profiles).toHaveLength(1); // overwritten, not forked

      const profile = profiles[0];
      expect(profile.skills).toEqual(expect.arrayContaining(["Python", "SQL"]));
      expect(profile.profileVersion).toBe(2);
      expect(profile.sourceDescriptionHash).toBe(hashDescription(newDescription));
    });
  });

  describe("failure handling", () => {
    it("marks the job failed (without crashing) when there is no description to process", async () => {
      const { job } = await createJobDirect({ description: "   " });

      const result = await processJobIntelligence(job._id);
      expect(result.status).toBe("failed");
      expect(result.reason).toBe("no_description_to_process");

      const updatedJob = await JobModel.findById(job._id);
      expect(updatedJob.intelligenceProcessingStatus).toBe("failed");
      expect(updatedJob.intelligenceProcessingError).toBe("no_description_to_process");
    });

    it("marks the job failed (without crashing) when the AI service fails", async () => {
      const { job } = await createJobDirect();
      aiService.extractJobProfile.mockRejectedValueOnce(new Error("AI provider unavailable"));

      const result = await processJobIntelligence(job._id);
      expect(result.status).toBe("failed");
      expect(result.reason).toMatch(/ai_extraction_failed/);
    });

    it("marks the job failed on a malformed AI response", async () => {
      const { job } = await createJobDirect();
      const { MalformedAIResponseError } = jest.requireActual("../services/ai/aiService.js");
      aiService.extractJobProfile.mockRejectedValueOnce(
        new MalformedAIResponseError("extractJobProfile", "skills is not an array")
      );

      const result = await processJobIntelligence(job._id);
      expect(result.status).toBe("failed");
      expect(result.reason).toMatch(/ai_extraction_failed:MalformedAIResponseError/);
    });

    it("does not overwrite a job's existing good profile when a later reprocessing run fails", async () => {
      const { job } = await createJobDirect();
      await processJobIntelligence(job._id);

      await JobModel.findByIdAndUpdate(job._id, {
        $set: { intelligenceProcessingStatus: "pending" },
      });
      aiService.extractJobProfile.mockRejectedValueOnce(new Error("transient failure"));
      const result = await processJobIntelligence(job._id);
      expect(result.status).toBe("failed");

      const profile = await JobProfileModel.findOne({ job: job._id });
      // Still has the first run's good data, just flagged as failed for the latest attempt.
      expect(profile.skills).toEqual(expect.arrayContaining(["React", "Node.js"]));
      expect(profile.processingStatus).toBe("failed");
    });
  });

  describe("data isolation across jobs", () => {
    it("never mixes one job's extracted data into another job's profile", async () => {
      const { job: jobA } = await createJobDirect({ title: "Job A" });
      const { job: jobB } = await createJobDirect({
        title: "Job B",
        description: "Data scientist role requiring Python and SQL. 8 years of experience.",
      });

      await processJobIntelligence(jobA._id);
      await processJobIntelligence(jobB._id);

      const profileA = await JobProfileModel.findOne({ job: jobA._id });
      const profileB = await JobProfileModel.findOne({ job: jobB._id });

      expect(profileA.skills).toEqual(expect.arrayContaining(["React", "Node.js"]));
      expect(profileA.skills).not.toEqual(expect.arrayContaining(["Python"]));
      expect(profileB.skills).toEqual(expect.arrayContaining(["Python", "SQL"]));
      expect(profileB.skills).not.toEqual(expect.arrayContaining(["React"]));
    });
  });
});
