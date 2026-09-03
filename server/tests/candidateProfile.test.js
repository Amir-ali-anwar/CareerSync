import mongoose from "mongoose";
import CandidateProfile from "../models/CandidateProfileModel.js";
import User from "../models/User.js";
import { talentPayload } from "./helpers.js";

const createUser = async (overrides = {}) => User.create(talentPayload(overrides));

describe("CandidateProfile model", () => {
  it("creates a minimal profile with just a user reference", async () => {
    const user = await createUser();
    const profile = await CandidateProfile.create({ user: user._id });

    expect(profile.skills).toEqual([]);
    expect(profile.certifications).toEqual([]);
    expect(profile.preferredRoles).toEqual([]);
    expect(profile.preferredLocations).toEqual([]);
    expect(profile.workModePreference).toBe("any");
  });

  it("persists structured fields: skills, experience, education, preferences", async () => {
    const user = await createUser();
    const profile = await CandidateProfile.create({
      user: user._id,
      skills: ["React", "Node.js", "MongoDB"],
      yearsOfExperience: 4,
      education: [
        { degree: "BSc", field: "Computer Science", institution: "MIT", graduationYear: 2020 },
      ],
      certifications: ["AWS Certified Developer"],
      preferredRoles: ["Backend Engineer", "Full Stack Engineer"],
      preferredLocations: ["Remote", "New York"],
      workModePreference: "remote",
    });

    const saved = await CandidateProfile.findById(profile._id);
    expect(saved.skills).toEqual(["React", "Node.js", "MongoDB"]);
    expect(saved.yearsOfExperience).toBe(4);
    expect(saved.education[0]).toMatchObject({
      degree: "BSc",
      field: "Computer Science",
      institution: "MIT",
      graduationYear: 2020,
    });
    expect(saved.certifications).toEqual(["AWS Certified Developer"]);
    expect(saved.workModePreference).toBe("remote");
  });

  it("rejects an invalid workModePreference", async () => {
    const user = await createUser();
    await expect(
      CandidateProfile.create({ user: user._id, workModePreference: "underwater" })
    ).rejects.toThrow();
  });

  it("requires a user reference", async () => {
    await expect(CandidateProfile.create({})).rejects.toThrow();
  });

  it("enforces one profile per user (unique index)", async () => {
    const user = await createUser();
    await CandidateProfile.create({ user: user._id });
    await expect(CandidateProfile.create({ user: user._id })).rejects.toThrow();
  });

  it("excludes resumeText from a default query (select: false), like User.password", async () => {
    const user = await createUser();
    await CandidateProfile.create({
      user: user._id,
      resumeText: "Experienced backend engineer with 5 years...",
    });

    const defaultFetch = await CandidateProfile.findOne({ user: user._id });
    expect(defaultFetch.resumeText).toBeUndefined();

    const explicitFetch = await CandidateProfile.findOne({ user: user._id }).select("+resumeText");
    expect(explicitFetch.resumeText).toBe("Experienced backend engineer with 5 years...");
  });

  it("stores resumeMetadata linking back to the source application", async () => {
    const user = await createUser();
    const fakeApplicationId = new mongoose.Types.ObjectId();
    const profile = await CandidateProfile.create({
      user: user._id,
      resumeMetadata: {
        sourceApplicationId: fakeApplicationId,
        fileName: "resume.pdf",
        extractedAt: new Date("2026-01-01"),
      },
    });

    expect(profile.resumeMetadata.sourceApplicationId.toString()).toBe(fakeApplicationId.toString());
    expect(profile.resumeMetadata.fileName).toBe("resume.pdf");
  });
});
