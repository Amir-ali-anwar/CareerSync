import mongoose from "mongoose";
import { getCandidateProfile } from "../../services/agent/tools/candidate.tools.js";
import { searchJobs } from "../../services/agent/tools/job.tools.js";
import { calculateMatchForJob } from "../../services/agent/tools/match.tools.js";
import { analyzeApplications } from "../../services/agent/tools/application.tools.js";
import { getCareerInsights, prepareInterview } from "../../services/agent/tools/career.tools.js";
import { AgentToolError } from "../../services/agent/agentToolError.js";
import { createTalentAgent } from "../helpers.js";
import CandidateProfileModel from "../../models/CandidateProfileModel.js";

const BOGUS_ID = "not-a-valid-object-id";
const RANDOM_VALID_ID = new mongoose.Types.ObjectId().toString();

describe("agent tool authorization and validation", () => {
  it("every tool rejects a malformed userId instead of querying the database", async () => {
    await expect(getCandidateProfile(BOGUS_ID)).rejects.toThrow(AgentToolError);
    await expect(searchJobs(BOGUS_ID, {})).rejects.toThrow(AgentToolError);
    await expect(calculateMatchForJob(BOGUS_ID, { jobId: RANDOM_VALID_ID })).rejects.toThrow(AgentToolError);
    await expect(analyzeApplications(BOGUS_ID)).rejects.toThrow(AgentToolError);
    await expect(getCareerInsights(BOGUS_ID)).rejects.toThrow(AgentToolError);
    await expect(prepareInterview(BOGUS_ID, {})).rejects.toThrow(AgentToolError);
  });

  it("rejects an explicit jobId that isn't a valid ObjectId", async () => {
    const { user } = await createTalentAgent();
    await expect(searchJobs(String(user._id), { jobId: BOGUS_ID })).rejects.toThrow(AgentToolError);
    await expect(calculateMatchForJob(String(user._id), { jobId: BOGUS_ID })).rejects.toThrow(AgentToolError);
  });

  it("errors clearly (not silently) when an explicit jobId does not exist", async () => {
    const { user } = await createTalentAgent();
    await expect(searchJobs(String(user._id), { jobId: RANDOM_VALID_ID })).rejects.toThrow(AgentToolError);
  });

  it("getCandidateProfile degrades gracefully - a missing profile is not an error", async () => {
    const { user } = await createTalentAgent();
    const result = await getCandidateProfile(String(user._id));
    expect(result.exists).toBe(false);
    expect(result.status).toBe("not_found");
  });

  it("getCandidateProfile never returns resumeText or embedding fields", async () => {
    const { user } = await createTalentAgent();
    await CandidateProfileModel.create({ user: user._id, skills: ["React"], resumeText: "sensitive resume content" });
    const result = await getCandidateProfile(String(user._id));
    expect(result).not.toHaveProperty("resumeText");
    expect(result).not.toHaveProperty("embedding");
    expect(result.skills).toEqual(["React"]);
  });

  it("prepareInterview reports unavailable rather than inventing a job when no match exists", async () => {
    const { user } = await createTalentAgent();
    const result = await prepareInterview(String(user._id), {});
    expect(result.available).toBe(false);
  });
});
