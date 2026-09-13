import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import { executeCareerWorkflow } from "../services/agent/careerWorkflowExecutor.js";
import AgentWorkflowModel from "../models/AgentWorkflowModel.js";

const MAX_GOAL_LENGTH = 1000;
const MAX_THREAD_ID_LENGTH = 200;
const MAX_HISTORY_LIMIT = 20;

/**
 * @swagger
 * /api/v1/agent/execute:
 *   post:
 *     summary: Execute an agentic career workflow for the authenticated candidate (Module J)
 *     description: >
 *       Classifies a free-text career goal, builds a deterministic execution plan from
 *       an allowed action registry, and runs it against the candidate's own
 *       CandidateProfile, job matches, skill gaps, and applications - reusing the
 *       existing matching/skill-gap/career-insight services rather than re-deriving any
 *       of them. Read-only: no tool this executes ever applies to a job, changes an
 *       application status, or mutates data. Runs synchronously and returns the
 *       completed (or partially-completed) workflow in one response.
 *     tags: [Agent]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [goal]
 *             properties:
 *               goal:
 *                 type: string
 *                 example: Find the best AI Engineer jobs for me and tell me what I should do next.
 *               threadId:
 *                 type: string
 *                 description: Optional client-chosen id to link follow-up workflows in the same conversation.
 *     responses:
 *       200:
 *         description: Workflow executed (COMPLETED, PARTIAL, or FAILED status).
 *       400:
 *         description: Invalid goal input.
 *       401:
 *         description: Unauthorized - not authenticated
 *       403:
 *         description: Forbidden - caller is not a talent
 */
export const executeAgentWorkflow = async (req, res) => {
  const goal = typeof req.body?.goal === "string" ? req.body.goal.trim() : "";
  if (!goal || goal.length > MAX_GOAL_LENGTH) {
    throw new BadRequestError(`goal must be between 1 and ${MAX_GOAL_LENGTH} characters`);
  }

  const threadId = typeof req.body?.threadId === "string" ? req.body.threadId.trim() : undefined;
  if (threadId && threadId.length > MAX_THREAD_ID_LENGTH) {
    throw new BadRequestError(`threadId must be at most ${MAX_THREAD_ID_LENGTH} characters`);
  }

  const workflow = await executeCareerWorkflow(req.user.userId, { goal, threadId: threadId || undefined });
  res.status(StatusCodes.OK).json({ workflow });
};

/**
 * @swagger
 * /api/v1/agent/workflows/{workflowId}:
 *   get:
 *     summary: Fetch one persisted agent workflow (Module J)
 *     description: >
 *       Ownership-scoped: a workflow id belonging to another user 404s rather than
 *       403s, since a workflow id is never exposed to any user other than its owner.
 *     tags: [Agent]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow found
 *       404:
 *         description: Workflow not found
 */
export const getAgentWorkflow = async (req, res) => {
  const workflow = await AgentWorkflowModel.findOne({ _id: req.params.workflowId, user: req.user.userId });
  if (!workflow) throw new NotFoundError("Workflow not found");
  res.status(StatusCodes.OK).json({ workflow });
};

/**
 * @swagger
 * /api/v1/agent/workflows:
 *   get:
 *     summary: List the authenticated candidate's recent agent workflows (Module J)
 *     tags: [Agent]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Recent workflows, newest first
 */
export const listAgentWorkflows = async (req, res) => {
  const workflows = await AgentWorkflowModel.find({ user: req.user.userId })
    .sort({ createdAt: -1 })
    .limit(MAX_HISTORY_LIMIT)
    .select("goal targetRole status summary createdAt");
  res.status(StatusCodes.OK).json({ workflows });
};
