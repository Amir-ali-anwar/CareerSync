import mongoose from "mongoose";
import CandidateProfileModel from "../../../models/CandidateProfileModel.js";
import { AgentToolError } from "../agentToolError.js";

// candidate.tools - the only tool that reads CandidateProfile directly. Never selects
// `resumeText` or `embedding` (both are `select: false` on the schema anyway) - the
// agent's context/narrative layer must never see raw resume text or vectors, only the
// same normalized fields the matching engine itself scores against.
const getCandidateProfile = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) throw new AgentToolError("GET_CANDIDATE_PROFILE", "invalid userId");

  const profile = await CandidateProfileModel.findOne({ user: userId });
  return {
    exists: Boolean(profile),
    status: profile ? profile.processingStatus : "not_found",
    skills: profile?.skills || [],
    yearsOfExperience: profile?.yearsOfExperience ?? null,
    domains: profile?.domains || [],
    certifications: profile?.certifications || [],
    preferredRoles: profile?.preferredRoles || [],
    preferredLocations: profile?.preferredLocations || [],
    workModePreference: profile?.workModePreference || "any",
  };
};

export { getCandidateProfile };
