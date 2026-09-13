import { CAREER_ACTIONS, EXECUTION_PLANS } from "./careerActionRegistry.js";

// Phase 2 - CareerPlannerService. Turns a CareerGoalAnalyzer result into an ordered
// execution plan of allowed CAREER_ACTIONS only (never an arbitrary action - every name
// this returns is validated against CAREER_ACTIONS by the executor). Deterministic:
// the same goal always produces the same action sequence: see EXECUTION_PLANS.
//
// Per-action parameter resolution lives here too (not scattered across tools), so the
// full "goal -> plan -> parameters" decision is auditable in one place. Each resolver
// receives the goal analysis plus whatever earlier steps have already produced, and
// returns the params object the corresponding tool will be called with.
const PARAM_RESOLVERS = {
  [CAREER_ACTIONS.GET_CANDIDATE_PROFILE]: () => ({}),

  [CAREER_ACTIONS.SEARCH_JOBS]: (analysis) => ({ jobId: analysis.jobId, limit: 10 }),

  [CAREER_ACTIONS.CALCULATE_MATCH]: (analysis, results) => ({
    jobId: analysis.jobId || firstJobId(results),
  }),

  [CAREER_ACTIONS.ANALYZE_SKILLS]: (analysis, results) => ({
    jobIds: (results.SEARCH_JOBS?.items || []).slice(0, 3).map((item) => item.job.id),
  }),

  [CAREER_ACTIONS.ANALYZE_APPLICATIONS]: () => ({}),

  [CAREER_ACTIONS.GET_CAREER_INSIGHTS]: () => ({}),

  [CAREER_ACTIONS.PREPARE_INTERVIEW]: (analysis, results) => ({
    jobId: analysis.jobId || firstJobId(results),
  }),
};

const firstJobId = (results) => results.SEARCH_JOBS?.items?.[0]?.job?.id || null;

/**
 * @param {{ goal: string, jobId: string|null, targetRole: string|null }} analysis
 * @returns {Array<{ action: string, getParams: (analysis, results) => object }>}
 */
const buildExecutionPlan = (analysis) => {
  const actions = EXECUTION_PLANS[analysis.goal] || [];
  return actions.map((action) => {
    const resolver = PARAM_RESOLVERS[action];
    if (!resolver) {
      throw new Error(`No parameter resolver registered for career action "${action}"`);
    }
    return { action, getParams: resolver };
  });
};

export { buildExecutionPlan };
