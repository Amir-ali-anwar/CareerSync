import JobModal from "../models/JobsModal.js";
import JobApplicationModal from "../models/JobApplicationModal.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";
import { Parser } from 'json2csv';

/**
 * @swagger
 * /api/v1/talents:
 *   get:
 *     summary: Get all talents who applied to employer's jobs
 *     tags: [Talents]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Talents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: No Applicants found
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
export const getAllTalents = async (req, res) => {
  const employerId = req.user.userId;
  const employerJobs = await JobModal.find({ createdBy: employerId }).select('_id');
  const employerJobIds = employerJobs.map(job => job._id);
  const applications = await JobApplicationModal.find({ job: { $in: employerJobIds } })
  if(applications.length===0) return  res.status(StatusCodes.OK).json({msg:"No Applicants found" });
   res.status(StatusCodes.OK).json({ applications });
};

/**
 * @swagger
 * /api/v1/talents/{talentId}:
 *   get:
 *     summary: Get talent by ID with their applications
 *     tags: [Talents]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: talentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Talent user ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Talent retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 talent:
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
export const getTalentById=async(req,res)=>{
  const {talentId}= req.params
  const talent = await JobApplicationModal.find({talent:talentId}).populate('job')
  res.status(StatusCodes.OK).json({ talent });
}

/**
 * @swagger
 * /api/v1/talents/export:
 *   get:
 *     summary: Export job applications to CSV
 *     tags: [Talents]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Applications exported successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: "talentName,talentEmail,talentPhone,jobTitle,jobPosition,jobCompany,status,createdAt\nJohn Doe,john@example.com,+1234567890,Software Engineer,Developer,Tech Corp,pending,2024-01-01T00:00:00.000Z"
 *         headers:
 *           Content-Disposition:
 *             description: Attachment filename
 *             schema:
 *               type: string
 *               example: attachment; filename=job-applications.csv
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const exportApplications = async (req, res) => {
  const employerId = req.user.userId;

  // Step 1: Get all job IDs posted by this employer
  const employerJobs = await JobModal.find({ createdBy: employerId }).select('_id');
  const employerJobIds = employerJobs.map(job => job._id);

  // Step 2: Fetch applications for these jobs
  const applications = await JobApplicationModal.find({ job: { $in: employerJobIds } })
    .populate('talent', 'name email phone')
    .populate('job', 'title company position');

  if (applications.length === 0) {
    return res.status(StatusCodes.OK).json({ msg: 'No applicants found to export.' });
  }

  // Step 3: Transform data for CSV
  const formattedData = applications.map(app => ({
    talentName: app.talent?.name || '',
    talentEmail: app.talent?.email || '',
    talentPhone: app.talent?.phone || '',
    jobTitle: app.job?.title || '',
    jobPosition: app.job?.position || '',
    jobCompany: app.job?.company || '',
    status: app.status,
    createdAt: app.createdAt.toISOString(),
  }));

  // Step 4: Convert to CSV
  const fields = [
    'talentName',
    'talentEmail',
    'talentPhone',
    'jobTitle',
    'jobPosition',
    'jobCompany',
    'status',
    'createdAt',
  ];

  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(formattedData);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=job-applications.csv');
  res.status(StatusCodes.OK).send(csv);
};


