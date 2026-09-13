import mongoose from "mongoose";
import { analyzeCareerGoal } from "./careerGoalAnalyzer.js";
import { buildExecutionPlan } from "./careerPlannerService.js";
import { runCareerAction } from "./toolRegistry.js";
import { buildCareerActionPlan } from "./careerActionPlanBuilder.js";
import { buildAgentContext } from "./agentContextBuilder.js";
import { generateNarrative } from "./agentNarrativeService.js";
import { CAREER_GOALS } from "./careerActionRegistry.js";
import AgentWorkflowModel from "../../models/AgentWorkflowModel.js";
import logger from "../../utils/logger.js";

const SUPPORTED_GOALS_HINT =
  "Try: \"Find the best jobs for me\", \"What should I focus on today?\", " +
  "\"Analyze my skill gaps\", \"Help me prepare for an interview\", or \"Build my career strategy\".";

// Public, API/friendly key names for each internal CAREER_ACTIONS result - the executor
// only exposes results for steps that actually completed (Phase 6's "do not fake
// progress" - a step that failed or never ran contributes nothing to `result`).
const RESULT_KEY_BY_ACTION = {
  GET_CANDIDATE_PROFILE: "candidateProfile",
  SEARCH_JOBS: "jobs",
  ANALYZE_SKILLS: "skillGaps",
  ANALYZE_APPLICATIONS: "applications",
  GET_CAREER_INSIGHTS: "careerInsights",
  PREPARE_INTERVIEW: "interviewPrep",
};

// Phase 13 - lightweight agent memory: the only thing carried across a thread is a
// previously-referenced job id, used solely to fill in a missing target job for
// INTERVIEW_PREPARATION when the user's message alone doesn't name one (e.g. a
// follow-up "now help me prepare for it" after an earlier "find me AI jobs" in the same
// thread). No conversation transcript, resume text, or profile data is stored/replayed.
const recallJobIdFromThread = async (userId, threadId) => {
  if (!threadId) return null;
  const previous = await AgentWorkflowModel.findOne({ user: userId, threadId }).sort({ createdAt: -1 });
  const jobReference = previous?.references?.find((reference) => reference.type === "job");
  return jobReference?.id || null;
};

const buildReferences = (resultsByAction) => {
  const references = [];
  for (const item of resultsByAction.SEARCH_JOBS?.items || []) {
    references.push({ type: "job", id: item.job.id });
  }
  for (const item of resultsByAction.ANALYZE_APPLICATIONS?.needingAttention || []) {
    references.push({ type: "application", id: String(item.applicationId) });
  }
  if (resultsByAction.PREPARE_INTERVIEW?.available) {
    references.push({ type: "job", id: resultsByAction.PREPARE_INTERVIEW.job.id });
  }
  // De-duplicate while preserving first-seen order (a job can legitimately appear from
  // both SEARCH_JOBS and PREPARE_INTERVIEW).
  const seen = new Set();
  return references.filter((reference) => {
    const key = `${reference.type}:${reference.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const computeStatus = (steps) => {
  if (steps.length === 0) return "COMPLETED";
  const failed = steps.filter((step) => step.status === "failed");
  if (failed.length === 0) return "COMPLETED";
  const completed = steps.filter((step) => step.status === "completed");
  return completed.length === 0 ? "FAILED" : "PARTIAL";
};

const buildUnknownGoalResult = async (userId, rawText, threadId) => {
  const workflow = await AgentWorkflowModel.create({
    user: userId,
    threadId: threadId || null,
    goal: CAREER_GOALS.UNKNOWN,
    targetRole: null,
    status: "COMPLETED",
    plan: [],
    summary: `I couldn't map that to a supported career goal. ${SUPPORTED_GOALS_HINT}`,
    narrativeSource: "deterministic_fallback",
    recommendedActions: [],
    references: [],
  });

  return {
    workflowId: String(workflow._id),
    status: "COMPLETED",
    goal: CAREER_GOALS.UNKNOWN,
    targetRole: null,
    plan: [],
    result: {},
    recommendedActions: [],
    summary: workflow.summary,
    references: [],
    createdAt: workflow.createdAt,
  };
};

/**
 * Phase 5/6/8 - runs the full plan-and-execute pipeline for one career goal and
 * persists the resulting workflow. Always scoped to the authenticated `userId` - no
 * tool call in this pipeline ever accepts a different user id (Phase 21).
 *
 * @param {string} userId
 * @param {{ goal: string, threadId?: string }} request - `goal` is the user's free-text
 *   career goal/question (matches the module brief's `POST /api/v1/agent/execute` body).
 */
const executeCareerWorkflow = async (userId, { goal: goalText, threadId } = {}) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw new Error("executeCareerWorkflow requires an authenticated userId");
  }

  const recalledJobId = await recallJobIdFromThread(userId, threadId);
  const analysis = analyzeCareerGoal(goalText);
  if (!analysis.jobId && recalledJobId) analysis.jobId = recalledJobId;

  if (analysis.goal === CAREER_GOALS.UNKNOWN) {
    return buildUnknownGoalResult(userId, analysis.rawText, threadId);
  }

  const plan = buildExecutionPlan(analysis);
  const resultsByAction = {};
  const steps = [];

  for (const step of plan) {
    const startedAt = Date.now();
    try {
      const params = step.getParams(analysis, resultsByAction);
      // eslint-disable-next-line no-await-in-loop -- steps are intentionally sequential:
      // later steps (e.g. ANALYZE_SKILLS) depend on earlier ones' output (SEARCH_JOBS).
      const output = await runCareerAction(step.action, userId, params);
      resultsByAction[step.action] = output;
      steps.push({ action: step.action, status: "completed", durationMs: Date.now() - startedAt });
      logger.info("agent_step_completed", { goal: analysis.goal, action: step.action, durationMs: Date.now() - startedAt });
    } catch (error) {
      steps.push({ action: step.action, status: "failed", durationMs: Date.now() - startedAt, error: error.message });
      logger.warn("agent_step_failed", { goal: analysis.goal, action: step.action, message: error.message });
    }
  }

  const recommendedActions = buildCareerActionPlan(resultsByAction);
  const context = buildAgentContext(analysis, resultsByAction, recommendedActions);
  const { narrative, source: narrativeSource } = await generateNarrative(context);
  const references = buildReferences(resultsByAction);
  const status = computeStatus(steps);

  const result = Object.fromEntries(
    Object.entries(RESULT_KEY_BY_ACTION)
      .filter(([action]) => resultsByAction[action] !== undefined)
      .map(([action, key]) => [key, resultsByAction[action]])
  );

  const workflow = await AgentWorkflowModel.create({
    user: userId,
    threadId: threadId || null,
    goal: analysis.goal,
    targetRole: analysis.targetRole,
    status,
    plan: steps,
    summary: narrative,
    narrativeSource,
    recommendedActions,
    references,
  });

  logger.info("agent_workflow_completed", { workflowId: String(workflow._id), goal: analysis.goal, status });

  return {
    workflowId: String(workflow._id),
    status,
    goal: analysis.goal,
    targetRole: analysis.targetRole,
    plan: steps,
    result,
    recommendedActions,
    summary: narrative,
    references,
    createdAt: workflow.createdAt,
  };
};

export { executeCareerWorkflow };
