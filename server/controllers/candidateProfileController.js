import { StatusCodes } from "http-status-codes";
import CandidateProfileModel from "../models/CandidateProfileModel.js";
import { NotFoundError, BadRequestError } from "../errors/index.js";
import { triggerResumeProcessingForUser } from "../services/resume/resumeProcessingService.js";
import { calculateMatchesForCandidate } from "../services/matching/matchingService.js";

const EDITABLE_FIELDS = [
  "skills",
  "yearsOfExperience",
  "education",
  "certifications",
  "domains",
  "preferredRoles",
  "preferredLocations",
  "workModePreference",
];

/**
 * @swagger
 * /api/v1/candidate-profile:
 *   get:
 *     summary: Get the authenticated talent's own candidate profile
 *     description: >
 *       There is exactly one CandidateProfile per user, created/overwritten as a side
 *       effect of resume processing (job-application or standalone upload). 404 if the
 *       caller has never had a resume processed.
 *     tags: [Candidate Profile]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Candidate profile retrieved successfully
 *       401:
 *         description: Unauthorized - not authenticated
 *       403:
 *         description: Forbidden - caller is not a talent
 *       404:
 *         description: No candidate profile exists yet for this user
 */
export const getMyCandidateProfile = async (req, res) => {
  const profile = await CandidateProfileModel.findOne({ user: req.user.userId });
  if (!profile) {
    throw new NotFoundError("No candidate profile yet - upload a resume to create one");
  }
  res.status(StatusCodes.OK).json({ profile });
};

/**
 * @swagger
 * /api/v1/candidate-profile:
 *   patch:
 *     summary: Create or edit the authenticated talent's own candidate profile
 *     description: >
 *       Whitelists only hand-editable fields (skills, yearsOfExperience, education,
 *       certifications, domains, preferredRoles, preferredLocations, workModePreference).
 *       Resume-derived fields (resumeText, resumeMetadata, processingStatus, embedding)
 *       are never client-settable. Upserts - a talent who has never uploaded a resume can
 *       still hand-build a minimal profile.
 *     tags: [Candidate Profile]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Candidate profile updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - not authenticated
 *       403:
 *         description: Forbidden - caller is not a talent
 */
export const updateMyCandidateProfile = async (req, res) => {
  const update = {};
  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }
  if (Object.keys(update).length === 0) {
    throw new BadRequestError("Please provide at least one field to update");
  }

  const profile = await CandidateProfileModel.findOneAndUpdate(
    { user: req.user.userId },
    { $setOnInsert: { user: req.user.userId }, $set: update, $inc: { profileVersion: 1 } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  res.status(StatusCodes.OK).json({ msg: "Candidate profile updated successfully", profile });
};

/**
 * @swagger
 * /api/v1/candidate-profile/resume:
 *   post:
 *     summary: Upload a resume independent of any job application
 *     description: >
 *       Runs the same AI resume-processing pipeline as applying to a job, but without
 *       requiring a job application. Fire-and-forget - the response never waits on text
 *       extraction or the AI call; poll GET /candidate-profile for processingStatus.
 *     tags: [Candidate Profile]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [cv]
 *             properties:
 *               cv:
 *                 type: string
 *                 format: binary
 *     responses:
 *       202:
 *         description: Resume accepted, processing in the background
 *       400:
 *         description: Bad request - no file attached, or invalid file type/size
 *       401:
 *         description: Unauthorized - not authenticated
 *       403:
 *         description: Forbidden - caller is not a talent
 */
export const uploadResume = async (req, res) => {
  if (!req?.file) {
    throw new BadRequestError("Please attach your resume/CV");
  }
  const cvPath = `/uploads/cvs/${req.file.filename}`;
  triggerResumeProcessingForUser(req.user.userId, cvPath, req.file.originalname);
  res.status(StatusCodes.ACCEPTED).json({
    msg: "Resume uploaded. AI is analyzing it in the background.",
  });
};

/**
 * @swagger
 * /api/v1/candidate-profile/matches:
 *   get:
 *     summary: Get every open job ranked by match score against the caller's own profile
 *     description: >
 *       Batched counterpart to GET /jobs/{jobId}/match - scores and ranks open,
 *       non-expired jobs (capped at 500) against the caller's CandidateProfile in one
 *       call, rather than one job at a time.
 *     tags: [Candidate Profile]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50 }
 *       - in: query
 *         name: minScore
 *         schema: { type: number, minimum: 0, maximum: 100 }
 *     responses:
 *       200:
 *         description: Ranked matches retrieved successfully
 *       401:
 *         description: Unauthorized - not authenticated
 *       403:
 *         description: Forbidden - caller is not a talent
 */
export const getMyMatches = async (req, res) => {
  const rawPage = req.query.page;
  const rawLimit = req.query.limit;
  const rawMinScore = req.query.minScore;
  const page = rawPage === undefined ? 1 : Number(rawPage);
  const limit = rawLimit === undefined ? 10 : Number(rawLimit);
  const minScore = rawMinScore === undefined ? 0 : Number(rawMinScore);
  if (!Number.isInteger(page) || page < 1) {
    throw new BadRequestError("page must be a positive integer");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new BadRequestError("limit must be an integer between 1 and 50");
  }
  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) {
    throw new BadRequestError("minScore must be a number between 0 and 100");
  }

  const { items, total, numOfPages, currentPage, candidateProfileStatus, usedSemanticRetrieval } =
    await calculateMatchesForCandidate(req.user.userId, { page, limit, minScore });

  res.status(StatusCodes.OK).json({
    totalJobs: total,
    numOfPages,
    currentPage,
    candidateProfileStatus,
    usedSemanticRetrieval,
    matches: items,
  });
};
