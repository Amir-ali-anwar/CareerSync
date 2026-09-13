import mongoose from "mongoose";
import { buildCareerInsights } from "../../career/careerCopilotService.js";
import { calculateMatchesForCandidate } from "../../matching/matchingService.js";
import { buildSkillGapAnalysis } from "../../career/skillGapService.js";
import { calculateMatchForJob } from "./match.tools.js";
import { AgentToolError } from "../agentToolError.js";

// career.tools - Career Strategy Agent (Phase 3 #5) support + interview prep (Workflow C).
// getCareerInsights reuses Module I's buildCareerInsights for readiness and historical
// skill-gap frequency - no second readiness/gap-frequency calculation is introduced here.
const getCareerInsights = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) throw new AgentToolError("GET_CAREER_INSIGHTS", "invalid userId");
  const insights = await buildCareerInsights(userId);
  return { readiness: insights.readiness, skillGaps: insights.skillGaps, recommendations: insights.recommendations };
};

// Workflow C ("Help me prepare for this job"): Get Job -> Get Candidate -> Get Match ->
// Identify Gaps -> Relevant Experience -> Preparation Plan. Built on the exact same
// getMatchWithProfiles + buildSkillGapAnalysis evidence matchController/skillGapService
// already produce - no separate interview-specific scoring.
const prepareInterview = async (userId, { jobId } = {}) => {
  if (!mongoose.isValidObjectId(userId)) throw new AgentToolError("PREPARE_INTERVIEW", "invalid userId");

  let targetJobId = jobId;
  if (!targetJobId) {
    const { items } = await calculateMatchesForCandidate(userId, { page: 1, limit: 1, minScore: 0 });
    targetJobId = items[0]?.job?._id ? String(items[0].job._id) : null;
  }
  if (!targetJobId) {
    return { available: false, reason: "No matched job is available yet to prepare for." };
  }

  const { job, jobProfile, candidateProfile, match, classification } = await calculateMatchForJob(userId, {
    jobId: targetJobId,
  });
  const gapAnalysis = buildSkillGapAnalysis(match, {
    candidateCertifications: candidateProfile?.certifications || [],
    jobCertifications: jobProfile?.certifications || [],
  });

  return {
    available: true,
    job: { id: String(job._id), title: job.title || job.position, company: job.company },
    matchScore: match.matchScore,
    matchLevel: classification,
    strengths: match.matchedSkills.slice(0, 5),
    focusAreas: gapAnalysis.prioritizedRoadmap.slice(0, 5),
    responsibilities: jobProfile?.responsibilities || [],
  };
};

export { getCareerInsights, prepareInterview };
