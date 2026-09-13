import mongoose from "mongoose";
import { calculateMatchesForCandidate, getMatchWithProfiles } from "../../matching/matchingService.js";
import { classifyMatchLevel } from "../../matching/matchLevel.js";
import { AgentToolError } from "../agentToolError.js";

// job.tools - job discovery. Deliberately does NOT re-implement retrieval, semantic
// search, or scoring: `calculateMatchesForCandidate` already does candidate-embedding
// retrieval (falling back to a deterministic recent-jobs scan) plus scoring and ranking
// in one call (see matchingService.js) - this tool only shapes that result for the
// agent context, trimming full Mongoose job documents down to the fields a career
// workflow (or an LLM narrative built on top of it) actually needs.
const MAX_LIMIT = 20;

const toJobSummary = (job) => ({
  id: String(job._id),
  title: job.title || job.position,
  company: job.company,
  jobType: job.jobType,
  workMode: job.workMode || null,
  location: job.jobLocation ? `${job.jobLocation.city}, ${job.jobLocation.country}` : null,
});

/**
 * @param {string} userId
 * @param {{ jobId?: string|null, limit?: number }} params - `jobId` narrows to a single
 *   explicitly-referenced job (e.g. "prepare me for interview at <job id>"); omitted,
 *   this returns the candidate's top-ranked open jobs.
 */
const searchJobs = async (userId, { jobId = null, limit = 10 } = {}) => {
  if (!mongoose.isValidObjectId(userId)) throw new AgentToolError("SEARCH_JOBS", "invalid userId");
  const boundedLimit = Math.min(Math.max(Number(limit) || 10, 1), MAX_LIMIT);

  if (jobId) {
    if (!mongoose.isValidObjectId(jobId)) throw new AgentToolError("SEARCH_JOBS", "invalid jobId");
    const result = await getMatchWithProfiles(userId, jobId);
    if (!result) throw new AgentToolError("SEARCH_JOBS", "job not found");
    return {
      items: [
        {
          job: toJobSummary(result.job),
          matchScore: result.match.matchScore,
          classification: classifyMatchLevel(result.match.matchScore),
          matchedSkills: result.match.matchedSkills,
          missingRequiredSkills: result.match.missingRequiredSkills,
        },
      ],
      total: 1,
      usedSemanticRetrieval: false,
      candidateProfileStatus: result.match.candidateProfileStatus,
    };
  }

  const { items, total, usedSemanticRetrieval, candidateProfileStatus } = await calculateMatchesForCandidate(userId, {
    page: 1,
    limit: boundedLimit,
    minScore: 0,
  });

  return {
    items: items.map((item) => ({
      job: toJobSummary(item.job),
      matchScore: item.matchScore,
      classification: item.classification,
      matchedSkills: item.matchedSkills,
      missingRequiredSkills: item.missingRequiredSkills,
    })),
    total,
    usedSemanticRetrieval,
    candidateProfileStatus,
  };
};

export { searchJobs, toJobSummary };
