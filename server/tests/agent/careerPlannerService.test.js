import { buildExecutionPlan } from "../../services/agent/careerPlannerService.js";
import { CAREER_ACTIONS, CAREER_GOALS } from "../../services/agent/careerActionRegistry.js";

describe("careerPlannerService", () => {
  it("builds the documented FIND_JOBS plan: profile -> search -> skill analysis", () => {
    const plan = buildExecutionPlan({ goal: CAREER_GOALS.FIND_JOBS, jobId: null, targetRole: "AI Engineer" });
    expect(plan.map((step) => step.action)).toEqual([
      CAREER_ACTIONS.GET_CANDIDATE_PROFILE,
      CAREER_ACTIONS.SEARCH_JOBS,
      CAREER_ACTIONS.ANALYZE_SKILLS,
    ]);
  });

  it("never emits an action outside the allowed CAREER_ACTIONS registry, for every goal", () => {
    const allowedActions = new Set(Object.values(CAREER_ACTIONS));
    for (const goal of Object.values(CAREER_GOALS)) {
      const plan = buildExecutionPlan({ goal, jobId: null, targetRole: null });
      for (const step of plan) {
        expect(allowedActions.has(step.action)).toBe(true);
      }
    }
  });

  it("returns an empty plan for UNKNOWN - nothing is executed for an unclassified goal", () => {
    expect(buildExecutionPlan({ goal: CAREER_GOALS.UNKNOWN, jobId: null, targetRole: null })).toEqual([]);
  });

  it("resolves ANALYZE_SKILLS params from the prior SEARCH_JOBS step's top jobs", () => {
    const plan = buildExecutionPlan({ goal: CAREER_GOALS.FIND_JOBS, jobId: null, targetRole: null });
    const analyzeSkillsStep = plan.find((step) => step.action === CAREER_ACTIONS.ANALYZE_SKILLS);
    const results = {
      SEARCH_JOBS: {
        items: [
          { job: { id: "a" } },
          { job: { id: "b" } },
          { job: { id: "c" } },
          { job: { id: "d" } },
        ],
      },
    };
    expect(analyzeSkillsStep.getParams({ goal: CAREER_GOALS.FIND_JOBS }, results)).toEqual({
      jobIds: ["a", "b", "c"],
    });
  });

  it("carries an explicit jobId from the goal analysis into SEARCH_JOBS params", () => {
    const plan = buildExecutionPlan({ goal: CAREER_GOALS.INTERVIEW_PREPARATION, jobId: "507f1f77bcf86cd799439011", targetRole: null });
    const searchStep = plan.find((step) => step.action === CAREER_ACTIONS.SEARCH_JOBS);
    expect(searchStep.getParams({ jobId: "507f1f77bcf86cd799439011" }, {})).toEqual({
      jobId: "507f1f77bcf86cd799439011",
      limit: 10,
    });
  });
});
