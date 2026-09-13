import { calculateMatchForJob } from "./match.tools.js";
import { buildSkillGapAnalysis } from "../../career/skillGapService.js";

// skillGap.tools - Skill Gap Agent (Phase 3 #3). Reuses skillGapService.buildSkillGapAnalysis
// exactly as matchController does - no second skill-comparison system. Bounded to a
// handful of jobs (the candidate's own top matches from the prior SEARCH_JOBS step) so
// a career workflow never triggers an unbounded scan.
const MAX_JOBS = 3;

const analyzeSkillGaps = async (userId, { jobIds = [] } = {}) => {
  const boundedIds = [...new Set(jobIds.filter(Boolean))].slice(0, MAX_JOBS);
  if (boundedIds.length === 0) {
    return { analyzed: 0, gapsByJob: [], topGaps: [] };
  }

  const gapsByJob = [];
  for (const jobId of boundedIds) {
    try {
      // eslint-disable-next-line no-await-in-loop -- intentionally sequential: MAX_JOBS
      // bounds this to at most 3 iterations, and each job's gap analysis is independent.
      const { job, jobProfile, candidateProfile, match } = await calculateMatchForJob(userId, { jobId });
      const analysis = buildSkillGapAnalysis(match, {
        candidateCertifications: candidateProfile?.certifications || [],
        jobCertifications: jobProfile?.certifications || [],
      });
      gapsByJob.push({
        jobId: String(job._id),
        jobTitle: job.title || job.position,
        company: job.company,
        matchScore: analysis.matchScore,
        matchLevel: analysis.matchLevel,
        summary: analysis.summary,
        topGaps: analysis.prioritizedRoadmap.slice(0, 5),
      });
    } catch (error) {
      // A single job's gap analysis failing (e.g. deleted between SEARCH_JOBS and this
      // step) does not fail the whole tool call - Phase 15's partial-failure principle
      // applied at this tool's own internal granularity.
    }
  }

  const bySkill = new Map();
  for (const entry of gapsByJob) {
    for (const gap of entry.topGaps) {
      const key = `${gap.category}:${gap.item}`;
      const existing = bySkill.get(key);
      if (existing) existing.seenInJobs += 1;
      else bySkill.set(key, { ...gap, seenInJobs: 1 });
    }
  }
  const topGaps = [...bySkill.values()]
    .sort((a, b) => b.seenInJobs - a.seenInJobs || a.rank - b.rank)
    .slice(0, 5);

  return { analyzed: gapsByJob.length, gapsByJob, topGaps };
};

export { analyzeSkillGaps };
