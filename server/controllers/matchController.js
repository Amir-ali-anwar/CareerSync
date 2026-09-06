import { StatusCodes } from "http-status-codes";
import { NotFoundError } from "../errors/index.js";
import { calculateMatchForCandidateAndJob } from "../services/matching/matchingService.js";

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
