import { analyzeCareerGoal } from "../../services/agent/careerGoalAnalyzer.js";
import { CAREER_GOALS } from "../../services/agent/careerActionRegistry.js";

describe("careerGoalAnalyzer", () => {
  it.each([
    ["Find the best AI Engineer jobs for me and tell me what I should do next.", CAREER_GOALS.FIND_JOBS],
    ["Which jobs should I prioritize?", CAREER_GOALS.PRIORITIZE_JOBS],
    ["What are my biggest skill gaps?", CAREER_GOALS.ANALYZE_SKILL_GAPS],
    ["Which applications need follow-up?", CAREER_GOALS.ANALYZE_APPLICATIONS],
    ["Build my career strategy", CAREER_GOALS.CAREER_PLANNING],
    ["What's my job search strategy?", CAREER_GOALS.JOB_SEARCH_STRATEGY],
    ["Improve my resume", CAREER_GOALS.RESUME_IMPROVEMENT],
    ["Help me prepare for this job interview", CAREER_GOALS.INTERVIEW_PREPARATION],
    ["What should I focus on today?", CAREER_GOALS.WEEKLY_CAREER_PLAN],
    ["asdkjaslkdj random text", CAREER_GOALS.UNKNOWN],
    ["", CAREER_GOALS.UNKNOWN],
  ])("classifies %s as %s", (text, expectedGoal) => {
    expect(analyzeCareerGoal(text).goal).toBe(expectedGoal);
  });

  it("extracts a target role hint from the goal text", () => {
    expect(analyzeCareerGoal("Find the best AI Engineer jobs for me").targetRole).toMatch(/AI Engineer/i);
  });

  it("extracts an explicit job id from the goal text", () => {
    const jobId = "507f1f77bcf86cd799439011";
    expect(analyzeCareerGoal(`Help me prepare for interview for job ${jobId}`).jobId).toBe(jobId);
  });

  it("returns a null jobId and targetRole when neither is present", () => {
    const result = analyzeCareerGoal("What are my biggest skill gaps?");
    expect(result.jobId).toBeNull();
  });
});
