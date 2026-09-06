import { createTalentAgent, createEmployerAgent, createJob } from "./helpers.js";
import JobApplicationModel from "../models/JobApplicationModel.js";
import CandidateProfileModel from "../models/CandidateProfileModel.js";

// Mock only extractTextFromCv - jest's auto-mock would otherwise also replace the
// UnsupportedFileTypeError/TextExtractionError classes with generic mock constructors
// that don't preserve their real `this.name`, breaking any test that checks error
// identity. jest.requireActual keeps everything else (the real error classes) intact.
jest.mock("../services/resume/textExtraction.js", () => ({
  __esModule: true,
  ...jest.requireActual("../services/resume/textExtraction.js"),
  extractTextFromCv: jest.fn(),
}));
import { extractTextFromCv, UnsupportedFileTypeError } from "../services/resume/textExtraction.js";

// Wraps the REAL aiService (real fake-provider-backed extraction) in a jest.fn() so most
// tests exercise genuine fake-provider behavior - proving it produces a realistic
// structured profile from realistic text, not arbitrary placeholder data - while the one
// "AI service fails" test below can override it with mockRejectedValueOnce.
jest.mock("../services/ai/index.js", () => {
  const actual = jest.requireActual("../services/ai/index.js");
  return {
    __esModule: true,
    default: {
      ...actual.default,
      extractResumeProfile: jest.fn(actual.default.extractResumeProfile.bind(actual.default)),
    },
  };
});
import aiService from "../services/ai/index.js";

import { processResumeForApplication } from "../services/resume/resumeProcessingService.js";

const REALISTIC_RESUME_TEXT =
  "Senior Software Engineer with 6 years of experience. Skilled in React, Node.js, MongoDB, and AWS. " +
  "Bachelor's degree in Computer Science. Built fintech payment systems.";

const createApplication = async () => {
  const { agent: employer } = await createEmployerAgent();
  const job = await createJob(employer);
  const { agent: talent, user: talentUser } = await createTalentAgent();
  // Bypass the real upload/AI flow (which is triggered fire-and-forget by the controller)
  // by inserting the application directly, then driving processResumeForApplication
  // ourselves - this is what lets these tests be fully synchronous and deterministic.
  const application = await JobApplicationModel.create({
    job: job._id,
    talent: talentUser._id,
    cv: "/uploads/cvs/fake-resume.pdf",
  });
  return { application, talentUser, job };
};

describe("resumeProcessingService.processResumeForApplication", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("successful flow", () => {
    it("extracts a realistic profile and persists it to a new CandidateProfile", async () => {
      const { application, talentUser } = await createApplication();
      extractTextFromCv.mockResolvedValue(REALISTIC_RESUME_TEXT);

      const result = await processResumeForApplication(application._id);

      expect(result.status).toBe("completed");

      const profile = await CandidateProfileModel.findOne({ user: talentUser._id }).select("+resumeText");
      expect(profile).not.toBeNull();
      expect(profile.skills).toEqual(expect.arrayContaining(["React", "Node.js", "MongoDB", "AWS"]));
      expect(profile.yearsOfExperience).toBe(6);
      expect(profile.education[0].degree).toBe("Bachelor's");
      expect(profile.domains).toEqual(expect.arrayContaining(["Fintech"]));
      expect(profile.resumeText).toBe(REALISTIC_RESUME_TEXT);
      expect(profile.processingStatus).toBe("completed");
      expect(profile.profileVersion).toBe(1);
      expect(profile.resumeMetadata.sourceApplicationId.toString()).toBe(application._id.toString());

      const updatedApplication = await JobApplicationModel.findById(application._id);
      expect(updatedApplication.resumeProcessingStatus).toBe("completed");
    });
  });

  describe("idempotency", () => {
    it("does not reprocess (or duplicate anything) once an application is already completed", async () => {
      const { application, talentUser } = await createApplication();
      extractTextFromCv.mockResolvedValue(REALISTIC_RESUME_TEXT);

      const first = await processResumeForApplication(application._id);
      expect(first.status).toBe("completed");
      expect(extractTextFromCv).toHaveBeenCalledTimes(1);

      const second = await processResumeForApplication(application._id);
      expect(second.status).toBe("skipped");
      expect(extractTextFromCv).toHaveBeenCalledTimes(1); // not called again

      const profiles = await CandidateProfileModel.find({ user: talentUser._id });
      expect(profiles).toHaveLength(1); // never duplicated
    });

    it("does not create two CandidateProfile documents when two different applications process for the same user", async () => {
      const { application: firstApplication, talentUser } = await createApplication();
      const { agent: employer2 } = await createEmployerAgent();
      const secondJob = await createJob(employer2, { title: "Second Job" });
      const secondApplication = await JobApplicationModel.create({
        job: secondJob._id,
        talent: talentUser._id,
        cv: "/uploads/cvs/fake-resume-2.pdf",
      });

      extractTextFromCv.mockResolvedValueOnce(REALISTIC_RESUME_TEXT);
      await processResumeForApplication(firstApplication._id);

      extractTextFromCv.mockResolvedValueOnce(
        "Backend engineer with 3 years of experience. Skilled in Python, Django, PostgreSQL. Master's degree."
      );
      const second = await processResumeForApplication(secondApplication._id);
      expect(second.status).toBe("completed");

      const profiles = await CandidateProfileModel.find({ user: talentUser._id });
      expect(profiles).toHaveLength(1);

      // The single profile now reflects the SECOND (latest) resume, not the first -
      // this is the documented "overwrite, don't version-fork" decision.
      const profile = profiles[0];
      expect(profile.skills).toEqual(expect.arrayContaining(["Python", "Django", "PostgreSQL"]));
      expect(profile.profileVersion).toBe(2);
      expect(profile.resumeMetadata.sourceApplicationId.toString()).toBe(secondApplication._id.toString());
    });
  });

  describe("failure handling", () => {
    it("marks the application failed (without crashing) when text extraction fails", async () => {
      const { application, talentUser } = await createApplication();
      extractTextFromCv.mockRejectedValue(new Error("corrupt PDF"));

      const result = await processResumeForApplication(application._id);

      expect(result.status).toBe("failed");
      expect(result.reason).toMatch(/text_extraction_failed/);

      const updatedApplication = await JobApplicationModel.findById(application._id);
      expect(updatedApplication.resumeProcessingStatus).toBe("failed");
      expect(updatedApplication.resumeProcessingError).toMatch(/text_extraction_failed/);

      // No profile should be manufactured out of a failed run for a brand-new candidate.
      const profile = await CandidateProfileModel.findOne({ user: talentUser._id });
      expect(profile).toBeNull();
    });

    it("marks the application failed for an unsupported file type", async () => {
      const { application } = await createApplication();
      extractTextFromCv.mockRejectedValue(new UnsupportedFileTypeError(".docx"));

      const result = await processResumeForApplication(application._id);
      expect(result.status).toBe("failed");
      expect(result.reason).toMatch(/text_extraction_failed:UnsupportedFileTypeError/);
    });

    it("marks the application failed (without crashing) when the AI service fails", async () => {
      const { application } = await createApplication();
      extractTextFromCv.mockResolvedValue(REALISTIC_RESUME_TEXT);
      aiService.extractResumeProfile.mockRejectedValueOnce(new Error("AI provider unavailable"));

      const result = await processResumeForApplication(application._id);
      expect(result.status).toBe("failed");
      expect(result.reason).toMatch(/ai_extraction_failed/);
    });

    it("marks the application failed (without crashing) on a malformed AI response", async () => {
      const { application } = await createApplication();
      extractTextFromCv.mockResolvedValue(REALISTIC_RESUME_TEXT);
      // Simulates what the real AIService would itself throw if a provider (real or
      // fake) ever returned a response failing shape validation (see aiService.test.js's
      // own direct test of that validation) - resumeProcessingService must handle
      // whatever AIService reports as a failure identically, without crashing or
      // writing partial data.
      const { MalformedAIResponseError } = jest.requireActual("../services/ai/aiService.js");
      aiService.extractResumeProfile.mockRejectedValueOnce(
        new MalformedAIResponseError("extractResumeProfile", "skills is not an array")
      );

      const result = await processResumeForApplication(application._id);
      expect(result.status).toBe("failed");
      expect(result.reason).toMatch(/ai_extraction_failed:MalformedAIResponseError/);
    });

    it("does not overwrite a candidate's existing good data when a later run fails", async () => {
      const { application, talentUser } = await createApplication();
      extractTextFromCv.mockResolvedValue(REALISTIC_RESUME_TEXT);
      await processResumeForApplication(application._id);

      const { agent: employer2 } = await createEmployerAgent();
      const secondJob = await createJob(employer2, { title: "Another Job" });
      const secondApplication = await JobApplicationModel.create({
        job: secondJob._id,
        talent: talentUser._id,
        cv: "/uploads/cvs/fake-resume-2.pdf",
      });
      extractTextFromCv.mockRejectedValueOnce(new Error("corrupt second PDF"));
      const result = await processResumeForApplication(secondApplication._id);
      expect(result.status).toBe("failed");

      const profile = await CandidateProfileModel.findOne({ user: talentUser._id }).select("+resumeText");
      // Still has the first run's good data, just flagged as failed for the latest attempt.
      expect(profile.skills).toEqual(expect.arrayContaining(["React", "Node.js"]));
      expect(profile.resumeText).toBe(REALISTIC_RESUME_TEXT);
      expect(profile.processingStatus).toBe("failed");
    });
  });

  describe("data isolation across candidates", () => {
    it("never mixes one candidate's extracted data into another candidate's profile", async () => {
      const { application: applicationA, talentUser: talentA } = await createApplication();
      const { application: applicationB, talentUser: talentB } = await createApplication();

      extractTextFromCv.mockResolvedValueOnce(REALISTIC_RESUME_TEXT); // React/Node/AWS
      await processResumeForApplication(applicationA._id);

      extractTextFromCv.mockResolvedValueOnce(
        "Data scientist with 8 years of experience in Python and SQL. PhD in Statistics."
      );
      await processResumeForApplication(applicationB._id);

      const profileA = await CandidateProfileModel.findOne({ user: talentA._id });
      const profileB = await CandidateProfileModel.findOne({ user: talentB._id });

      expect(profileA.skills).toEqual(expect.arrayContaining(["React", "Node.js"]));
      expect(profileA.skills).not.toEqual(expect.arrayContaining(["Python"]));
      expect(profileB.skills).toEqual(expect.arrayContaining(["Python", "SQL"]));
      expect(profileB.skills).not.toEqual(expect.arrayContaining(["React"]));
    });
  });
});
