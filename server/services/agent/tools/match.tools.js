import mongoose from "mongoose";
import { getMatchWithProfiles } from "../../matching/matchingService.js";
import { classifyMatchLevel } from "../../matching/matchLevel.js";
import { AgentToolError } from "../agentToolError.js";

// match.tools - single-job match lookup, built directly on `getMatchWithProfiles`
// (the same DB-aware core matchController and skillGapService already use) rather than
// re-scoring. Returns the raw job/jobProfile/candidateProfile documents alongside the
// match, since this is consumed internally by other tools (skillGap.tools,
// career.tools' prepareInterview) that need certifications/responsibilities the trimmed
// SEARCH_JOBS summary doesn't carry - callers that expose this to the API/narrative
// layer are responsible for shaping it down first (see job.tools.toJobSummary).
const calculateMatchForJob = async (userId, { jobId } = {}) => {
  if (!mongoose.isValidObjectId(userId)) throw new AgentToolError("CALCULATE_MATCH", "invalid userId");
  if (!jobId || !mongoose.isValidObjectId(jobId)) throw new AgentToolError("CALCULATE_MATCH", "invalid jobId");

  const result = await getMatchWithProfiles(userId, jobId);
  if (!result) throw new AgentToolError("CALCULATE_MATCH", "job not found");

  return {
    job: result.job,
    jobProfile: result.jobProfile,
    candidateProfile: result.candidateProfile,
    match: result.match,
    classification: classifyMatchLevel(result.match.matchScore),
  };
};

export { calculateMatchForJob };
