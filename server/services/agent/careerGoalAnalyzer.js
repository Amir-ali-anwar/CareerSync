import { CAREER_GOALS } from "./careerActionRegistry.js";

// Phase 1 - CareerGoalAnalyzer. Deterministic, pure, no database/network access (same
// "pure core" pattern as matchingService.calculateMatch) - classifies a free-text career
// goal into one of the fixed CAREER_GOALS. This is deliberately NOT an LLM call: goal
// vocabulary here is bounded and enumerable, so a regex classifier is both cheaper and
// more testable/deterministic than an LLM round-trip, matching the precedent set by
// Module I's careerCopilotService.detectIntent for the same kind of decision.

const OBJECT_ID_PATTERN = /\b[0-9a-f]{24}\b/i;

// Order matters - more specific goals are checked before broader ones so, e.g., a
// message mentioning both "resume" and "jobs" is treated as RESUME_IMPROVEMENT rather
// than FIND_JOBS.
const GOAL_PATTERNS = [
  { goal: CAREER_GOALS.RESUME_IMPROVEMENT, pattern: /\bresume|\bcv\b/i },
  { goal: CAREER_GOALS.INTERVIEW_PREPARATION, pattern: /\binterview/i },
  {
    goal: CAREER_GOALS.WEEKLY_CAREER_PLAN,
    pattern: /(weekly (career )?plan)|((focus|do|prioriti[sz]e).{0,20}\b(today|this week)\b)/i,
  },
  { goal: CAREER_GOALS.JOB_SEARCH_STRATEGY, pattern: /job search strategy/i },
  { goal: CAREER_GOALS.CAREER_PLANNING, pattern: /career (strategy|plan|planning)/i },
  {
    goal: CAREER_GOALS.ANALYZE_APPLICATIONS,
    pattern: /follow.?up|application(s)?\s*(status|update|need|health)|inactive application/i,
  },
  {
    goal: CAREER_GOALS.ANALYZE_SKILL_GAPS,
    pattern: /skill\s*gap|missing skill|what skills?|skills? (should|do) i (learn|need|improve|develop)/i,
  },
  {
    goal: CAREER_GOALS.PRIORITIZE_JOBS,
    pattern: /prioriti[sz]e (my )?jobs?|rank (the |my )?jobs?|which jobs? should i (apply|prioriti[sz]e|focus)/i,
  },
  {
    goal: CAREER_GOALS.FIND_JOBS,
    pattern: /find|best|search for|recommend|opportunit/i,
  },
];

// Best-effort target-role extraction (e.g. "Find the best AI Engineer jobs for me" ->
// "AI Engineer"). Purely a display/context hint for the narrative and plan metadata -
// no tool depends on this being present or correct, since job retrieval is driven by
// the candidate's own embedding/profile (see tools/job.tools.js), not by this string.
const ROLE_PATTERNS = [
  /(?:best|find|for)\s+(?:an?\s+)?([a-z][a-z0-9+.#/&\s-]{1,60}?)\s+(?:jobs?|roles?|positions?|opportunit\w*)/i,
  /as an?\s+([a-z][a-z0-9+.#/&\s-]{1,60}?)(?:[.,!?]|$)/i,
];

const extractTargetRole = (text) => {
  for (const pattern of ROLE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const role = match[1].trim().replace(/\s+/g, " ");
      if (role.length > 1) return role;
    }
  }
  return null;
};

const extractJobId = (text) => {
  const match = text.match(OBJECT_ID_PATTERN);
  return match ? match[0] : null;
};

const classifyGoal = (text) => {
  for (const { goal, pattern } of GOAL_PATTERNS) {
    if (pattern.test(text)) return goal;
  }
  return CAREER_GOALS.UNKNOWN;
};

/**
 * @param {string} goalText - the user's free-text career goal/question.
 * @returns {{ goal: string, targetRole: string|null, jobId: string|null, rawText: string }}
 */
const analyzeCareerGoal = (goalText) => {
  const text = String(goalText || "").trim();
  return {
    goal: text ? classifyGoal(text) : CAREER_GOALS.UNKNOWN,
    targetRole: extractTargetRole(text),
    jobId: extractJobId(text),
    rawText: text,
  };
};

export { analyzeCareerGoal, extractTargetRole, extractJobId, classifyGoal };
