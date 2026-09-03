import mongoose from "mongoose";
import JobProfile from "../models/JobProfileModel.js";
import JobModel from "../models/JobsModel.js";
import User from "../models/User.js";
import { employerPayload, validJobPayload } from "./helpers.js";

const createEmployer = async (overrides = {}) => User.create(employerPayload(overrides));

const createJobDoc = async (overrides = {}) => {
  const employer = await createEmployer();
  return JobModel.create({ ...validJobPayload(overrides), createdBy: employer._id });
};

describe("JobProfile model", () => {
  it("creates a minimal profile with just a job reference", async () => {
    const job = await createJobDoc();
    const profile = await JobProfile.create({ job: job._id });

    expect(profile.skills).toEqual([]);
    expect(profile.requiredSkills).toEqual([]);
    expect(profile.preferredSkills).toEqual([]);
    expect(profile.education).toEqual([]);
    expect(profile.certifications).toEqual([]);
    expect(profile.domains).toEqual([]);
    expect(profile.responsibilities).toEqual([]);
    expect(profile.processingStatus).toBe("pending");
    expect(profile.profileVersion).toBe(0);
    expect(profile.seniority).toBeNull();
  });

  it("persists structured fields", async () => {
    const job = await createJobDoc();
    const profile = await JobProfile.create({
      job: job._id,
      normalizedTitle: "software engineer",
      seniority: "senior",
      skills: ["React", "Node.js"],
      requiredSkills: ["React"],
      preferredSkills: ["Node.js"],
      yearsOfExperience: 5,
      education: ["Bachelor's"],
      certifications: ["AWS Certified"],
      domains: ["Fintech"],
      responsibilities: ["Build and maintain APIs"],
      sourceDescriptionHash: "abc123",
    });

    const saved = await JobProfile.findById(profile._id);
    expect(saved.normalizedTitle).toBe("software engineer");
    expect(saved.seniority).toBe("senior");
    expect(saved.skills).toEqual(["React", "Node.js"]);
    expect(saved.requiredSkills).toEqual(["React"]);
    expect(saved.preferredSkills).toEqual(["Node.js"]);
    expect(saved.yearsOfExperience).toBe(5);
    expect(saved.education).toEqual(["Bachelor's"]);
    expect(saved.domains).toEqual(["Fintech"]);
    expect(saved.responsibilities).toEqual(["Build and maintain APIs"]);
    expect(saved.sourceDescriptionHash).toBe("abc123");
  });

  it("rejects an invalid seniority value", async () => {
    const job = await createJobDoc();
    await expect(JobProfile.create({ job: job._id, seniority: "godlike" })).rejects.toThrow();
  });

  it("requires a job reference", async () => {
    await expect(JobProfile.create({})).rejects.toThrow();
  });

  it("enforces one profile per job (unique index)", async () => {
    const job = await createJobDoc();
    await JobProfile.create({ job: job._id });
    await expect(JobProfile.create({ job: job._id })).rejects.toThrow();
  });
});
