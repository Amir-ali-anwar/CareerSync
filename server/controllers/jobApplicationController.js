import JobModal from "../models/JobsModal.js";
import JobApplicationModal from "../models/JobApplicationModal.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError,NotFoundError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";
const VALID_STATUSES = ['pending', 'under review', 'shortlisted', 'interview', 'rejected'];
const ALLOWED_WITHDRAW_STATUSES = ['pending', 'under review'];

/**
 * @swagger
 * /api/v1/applications/{jobId}:
 *   get:
 *     summary: Get job applications for a specific job
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
 *                 msg:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/JobApplication'
 *       401:
 *         description: Unauthorized - invalid token or insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No job applications found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getJobApplications = async (req, res) => {
  const { jobId } = req.params;
  const jobApplicants = await JobApplicationModal.find({ job: jobId })
    .populate("talent")
    .populate({
      path: "job",
      populate: {
        path: "createdBy", 
        model: "User",
        select: "name email role",
      },
    });
  if (!jobApplicants || jobApplicants.length === 0) {
    return res.status(404).json({ error: "No job applications found." });
  }
const job = jobApplicants[0].job;

  if (!job || !job.createdBy) {
    return res.status(404).json({ error: "Job or creator info not found." });
  }

  checkPermissions(req.user, job.createdBy._id);
  res.status(StatusCodes.OK).json({ msg: jobApplicants });
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


  checkPermissions(req.user.userId,application.talent)
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
  res.status(StatusCodes.OK).json({TotalSubmittedApplications:applications.length, applications});
};
