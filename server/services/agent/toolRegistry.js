import { CAREER_ACTIONS } from "./careerActionRegistry.js";
import { getCandidateProfile } from "./tools/candidate.tools.js";
import { searchJobs } from "./tools/job.tools.js";
import { calculateMatchForJob } from "./tools/match.tools.js";
import { analyzeSkillGaps } from "./tools/skillGap.tools.js";
import { analyzeApplications } from "./tools/application.tools.js";
import { getCareerInsights, prepareInterview } from "./tools/career.tools.js";

// Phase 4 - the tool layer's single dispatch point. Every CAREER_ACTIONS entry maps to
// exactly one tool function here; the executor never imports a tool module directly,
// so this file is the one place that decides what a plan step is actually allowed to do.
const TOOL_REGISTRY = {
  [CAREER_ACTIONS.GET_CANDIDATE_PROFILE]: (userId) => getCandidateProfile(userId),
  [CAREER_ACTIONS.SEARCH_JOBS]: (userId, params) => searchJobs(userId, params),
  [CAREER_ACTIONS.CALCULATE_MATCH]: (userId, params) => calculateMatchForJob(userId, params),
  [CAREER_ACTIONS.ANALYZE_SKILLS]: (userId, params) => analyzeSkillGaps(userId, params),
  [CAREER_ACTIONS.ANALYZE_APPLICATIONS]: (userId) => analyzeApplications(userId),
  [CAREER_ACTIONS.GET_CAREER_INSIGHTS]: (userId) => getCareerInsights(userId),
  [CAREER_ACTIONS.PREPARE_INTERVIEW]: (userId, params) => prepareInterview(userId, params),
};

const runCareerAction = async (action, userId, params) => {
  const tool = TOOL_REGISTRY[action];
  if (!tool) throw new Error(`"${action}" is not a registered career action`);
  return tool(userId, params);
};

export { runCareerAction, TOOL_REGISTRY };
