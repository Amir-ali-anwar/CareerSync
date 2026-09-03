import JobModal from "../models/JobsModel.js";
import JobApplicationModal from "../models/JobApplicationModel.js";
import JobProfileModal from "../models/JobProfileModel.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError, ForbiddenError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";
import { cvExists, streamCv } from "../utils/cvStorage.js";
import { calculateMatchesForCandidates } from "../services/matching/matchingService.js";
const VALID_STATUSES = ['pending', 'under review', 'shortlisted', 'interview', 'rejected'];
const ALLOWED_WITHDRAW_STATUSES = ['pending', 'under review'];

/**
 * @swagger
 * /api/v1/applications/job/{jobId}:
 *   get:
 *     summary: Get job applications for a specific job, each annotated with a match score
 *     description: >
 *       Each application includes a `match` object (see GET /jobs/{jobId}/match for the
 *       full shape) computed against the requesting employer's own job - this reuses
 *       that endpoint's authorization (checkPermissions on job ownership) rather than
 *       exposing a separate route.
 *     tags: [Job Applications]
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
 *         description: Job applications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 applications:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/JobApplication'
 *                       - type: object
 *                         properties:
 *                           match:
 *                             type: object
 *                             description: This applicant's match score against the job (see GET /jobs/{jobId}/match)
 *       401:
 *         description: Unauthorized - invalid token or insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not the owner of this job
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getJobApplications = async (req, res) => {
  const { jobId } = req.params;

  const job = await JobModal.findById(jobId);
  if (!job) {
    throw new NotFoundError("Job not found");
  }
  checkPermissions(req.user, job.createdBy);

  const jobApplicants = await JobApplicationModal.find({ job: jobId }).populate(
    "talent",
    "name email phone profileImage"
  );

  // Annotate each applicant with their match score against this job - reuses this
  // already-authorized (checkPermissions above) endpoint rather than adding a new
  // route, and fetches every candidate's profile in one query (no N+1).
  const jobProfile = await JobProfileModal.findOne({ job: jobId });
  const talentIds = jobApplicants.map((application) => application.talent._id);
  const matchesByTalentId = await calculateMatchesForCandidates(talentIds, job, jobProfile);

  const applicationsWithMatch = jobApplicants.map((application) => ({
    ...application.toObject(),
    match: matchesByTalentId[String(application.talent._id)],
  }));

  res.status(StatusCodes.OK).json({ applications: applicationsWithMatch });
};

/**
 * @swagger
 * /api/v1/applications/{jobId}/{applicantId}/status:
 *   patch:
 *     summary: Update application status
 *     tags: [Job Applications]
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
 *       - in: path
 *         name: applicantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Applicant user ID
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, under review, shortlisted, interview, rejected]
 *                 description: New application status
 *                 example: shortlisted
 *     responses:
 *       200:
 *         description: Application status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Application status updated successfully
 *                 status:
 *                   type: string
 *                   example: shortlisted
 *       400:
 *         description: Bad request - invalid status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid token or insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Job application not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const updateApplicationStatus = async (req, res) => {
  const { jobId, applicantId } = req.params;
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    throw new BadRequestError("Invalid application status");
  }
  const application = await JobApplicationModal.findOne({
    job: jobId,
    talent: applicantId,
  });

  if (!application) {
    throw new NotFoundError("Job application not found");
  }
  const job = await JobModal.findById(jobId).populate("createdBy");
  if (!job) {
    throw new NotFoundError("Job not found");
  }
  checkPermissions(req.user, job.createdBy._id);

  application.status = status;
  await application.save();
  res
    .status(StatusCodes.OK)
    .json({ message: "Application status updated successfully", status });
};

/**
 * @swagger
 * /api/v1/applications/{id}/withdraw:
 *   patch:
 *     summary: Withdraw job application
 *     tags: [Job Applications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Application withdrawn successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Application withdrawn successfully
 *       400:
 *         description: Bad request - cannot withdraw after decision made
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid token or insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const withdrawApplication = async (req, res) => {
  const { id: applicationId } = req.params;
  const application = await JobApplicationModal.findById(applicationId);
  if (!application) {
    throw new NotFoundError("Job application not found");
  }

  checkPermissions(req.user, application.talent);
  if (!ALLOWED_WITHDRAW_STATUSES.includes(application.status)) {
    throw new BadRequestError(
      "You cannot withdraw after decision has been made"
    );
  }

  application.status = "withdrawn";
  await application.save();
  res
    .status(StatusCodes.OK)
    .json({ msg: "Application withdrawn successfully" });
};

/**
 * @swagger
 * /api/v1/applications/my-applications:
 *   get:
 *     summary: Get current user's job applications
 *     tags: [Job Applications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User's job applications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 TotalSubmittedApplications:
 *                   type: integer
 *                   description: Total number of applications submitted
 *                   example: 5
 *                 applications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/JobApplication'
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getMyApplications = async (req, res) => {
  const applications = await JobApplicationModal.find({ talent: req.user.userId }).populate('job');
  res.status(StatusCodes.OK).json({ TotalSubmittedApplications: applications.length, applications });
};

/**
 * @swagger
 * /api/v1/applications/{id}/cv:
 *   get:
 *     summary: Download the CV attached to a job application
 *     description: >
 *       Only the applicant who submitted the CV or the employer who owns the job it
 *       was submitted for may access the file. CVs are never served publicly.
 *     tags: [Job Applications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job application ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: CV file stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request - malformed application ID
 *       401:
 *         description: Unauthorized - not authenticated
 *       403:
 *         description: Forbidden - not the applicant or the owning employer
 *       404:
 *         description: Application or CV file not found
 */
export const getApplicationCV = async (req, res, next) => {
  const { id } = req.params;
  const application = await JobApplicationModal.findById(id).populate('job', 'createdBy');
  if (!application) {
    throw new NotFoundError("Job application not found");
  }

  const isApplicant = req.user.userId === application.talent.toString();
  const isOwningEmployer = Boolean(
    application.job && req.user.userId === application.job.createdBy.toString()
  );
  if (!isApplicant && !isOwningEmployer) {
    throw new ForbiddenError("You are not authorized to access this file");
  }

  if (!cvExists(application.cv)) {
    throw new NotFoundError("CV file not found");
  }

  streamCv(application.cv, res, next);
};
