import { StatusCodes } from "http-status-codes";
import { NotFoundError } from "../errors/index.js";
import { calculateMatchForCandidateAndJob, getMatchWithProfiles } from "../services/matching/matchingService.js";
import { buildMatchExplanation } from "../services/matching/explanationService.js";
import { buildSkillGapAnalysis } from "../services/career/skillGapService.js";

/**
 * @swagger
 * /api/v1/jobs/{jobId}/match:
 *   get:
 *     summary: Get the authenticated candidate's match score against a job
 *     description: >
 *       Computes a deterministic, explainable match between the authenticated talent's
 *       CandidateProfile and the specified job. Never accepts a candidate id from the
 *       request - always the authenticated caller's own profile, so there is no IDOR
 *       vector for viewing another candidate's match. A missing/incomplete
 *       CandidateProfile or JobProfile does not error - candidateProfileStatus/
 *       jobProfileStatus report data completeness alongside a best-effort score.
 *     tags: [Matching]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Match computed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 match:
 *                   type: object
 *                   properties:
 *                     matchScore:
 *                       type: integer
 *                       example: 87
 *                     componentScores:
 *                       type: object
 *                     matchedSkills:
 *                       type: array
 *                       items: { type: string }
 *                     missingRequiredSkills:
 *                       type: array
 *                       items: { type: string }
 *                     matchingAlgorithmVersion:
 *                       type: string
 *                       example: v1
 *                     candidateProfileStatus:
 *                       type: string
 *                       enum: [available, not_found, pending, processing, completed, failed]
 *                     jobProfileStatus:
 *                       type: string
 *                       enum: [not_found, pending, processing, completed, failed]
 *       401:
 *         description: Unauthorized - not authenticated
 *       403:
 *         description: Forbidden - caller is not a talent
 *       404:
 *         description: Job not found
 */
export const getJobMatch = async (req, res) => {
  const { jobId } = req.params;

  const match = await calculateMatchForCandidateAndJob(req.user.userId, jobId);
  if (!match) {
    throw new NotFoundError("Job not found");
  }

  res.status(StatusCodes.OK).json({ match });
};

/**
 * @swagger
 * /api/v1/jobs/{jobId}/match/explanation:
 *   get:
 *     summary: Explain why the authenticated candidate does or doesn't match a job (Module G)
 *     description: >
 *       Structured, deterministic "why you match" breakdown built entirely from the same
 *       evidence GET /jobs/{jobId}/match already computes - no LLM call, no re-running the
 *       matching engine or embeddings, and no data beyond what that endpoint already
 *       returns (score dimensions, matched/missing skills, experience/seniority/domain/
 *       preference comparisons). Never accepts a candidate id - always the authenticated
 *       caller's own profile, same IDOR-safe identity source as GET /jobs/{jobId}/match.
 *     tags: [Matching]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Explanation generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 explanation:
 *                   type: object
 *                   properties:
 *                     matchScore: { type: integer, example: 87 }
 *                     matchLevel:
 *                       type: object
 *                       properties:
 *                         level: { type: string, example: strong_match }
 *                         label: { type: string, example: Strong Match }
 *                     matchingAlgorithmVersion: { type: string, example: v2 }
 *                     scoreBreakdown:
 *                       type: array
 *                       items: { type: object }
 *                     matchedSkills:
 *                       type: array
 *                       items: { type: object }
 *                     missingSkills:
 *                       type: array
 *                       items: { type: object }
 *                     partialMatches:
 *                       type: array
 *                       items: { type: object }
 *                     strengths:
 *                       type: array
 *                       items: { type: object }
 *                     improvements:
 *                       type: array
 *                       items: { type: object }
 *                     summary: { type: string }
 *       401:
 *         description: Unauthorized - not authenticated
 *       403:
 *         description: Forbidden - caller is not a talent
 *       404:
 *         description: Job not found
 */
export const getJobMatchExplanation = async (req, res) => {
  const { jobId } = req.params;

  const match = await calculateMatchForCandidateAndJob(req.user.userId, jobId);
  if (!match) {
    throw new NotFoundError("Job not found");
  }

  const explanation = buildMatchExplanation(match);
  res.status(StatusCodes.OK).json({ explanation });
};

/**
 * @swagger
 * /api/v1/jobs/{jobId}/skill-gap:
 *   get:
 *     summary: Skill gap analysis and prioritized career-improvement roadmap for a job (Module H)
 *     description: >
 *       Deterministic, evidence-based breakdown of what's missing between the
 *       authenticated candidate's profile and this job, and what to focus on first - no
 *       LLM call, no re-running the matching engine or embeddings. Built entirely on top
 *       of the same MatchResult GET /jobs/{jobId}/match/explanation reads (Module G) -
 *       required/preferred skill gaps, experience/seniority/domain shortfalls - plus a
 *       certification gap (CandidateProfile.certifications vs JobProfile.certifications),
 *       the one comparison not already computed elsewhere. This is career-improvement
 *       guidance derived from evidence, not a prediction of what your score would become
 *       if you closed a gap. Candidate-private: never accepts a candidate id - always the
 *       authenticated caller's own profile, same IDOR-safe identity rule as
 *       GET /jobs/{jobId}/match. Not exposed to employers (see MODULE_H_REPORT.md's
 *       Security section for why).
 *     tags: [Career]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Gap analysis generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gapAnalysis:
 *                   type: object
 *                   properties:
 *                     matchScore: { type: integer, example: 72 }
 *                     matchLevel:
 *                       type: object
 *                       properties:
 *                         level: { type: string, example: moderate_match }
 *                         label: { type: string, example: Moderate Match }
 *                     matchingAlgorithmVersion: { type: string, example: v2 }
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalGaps: { type: integer }
 *                         criticalGaps: { type: integer }
 *                         highPriorityGaps: { type: integer }
 *                         message: { type: string }
 *                     gaps:
 *                       type: array
 *                       items: { type: object }
 *                     prioritizedRoadmap:
 *                       type: array
 *                       items: { type: object }
 *       401:
 *         description: Unauthorized - not authenticated
 *       403:
 *         description: Forbidden - caller is not a talent
 *       404:
 *         description: Job not found
 */
export const getJobSkillGapAnalysis = async (req, res) => {
  const { jobId } = req.params;

  const result = await getMatchWithProfiles(req.user.userId, jobId);
  if (!result) {
    throw new NotFoundError("Job not found");
  }

  const gapAnalysis = buildSkillGapAnalysis(result.match, {
    candidateCertifications: result.candidateProfile?.certifications || [],
    jobCertifications: result.jobProfile?.certifications || [],
  });

  res.status(StatusCodes.OK).json({ gapAnalysis });
};
