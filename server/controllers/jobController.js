import JobModal from "../models/JobsModal.js";
import JobApplicationModal from '../models/JobApplicationModal.js'
import { StatusCodes } from "http-status-codes";
import {BadRequestError, NotFoundError} from "../errors/index.js";
import {checkPermissions} from "../middlewares/permissions.js";

/**
 * @swagger
 * /api/v1/jobs:
 *   post:
 *     summary: Create a new job posting
 *     tags: [Jobs]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - company
 *               - jobType
 *               - jobLocation
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 description: Job title
 *                 example: Senior Software Engineer
 *               company:
 *                 type: string
 *                 description: Company name
 *                 example: Tech Corp
 *               position:
 *                 type: string
 *                 description: Job position
 *                 example: Software Engineer
 *               jobType:
 *                 type: string
 *                 enum: [full-time, part-time, internship]
 *                 description: Type of job
 *                 example: full-time
 *               jobLocation:
 *                 type: object
 *                 required:
 *                   - country
 *                   - city
 *                 properties:
 *                   country:
 *                     type: string
 *                     description: Job country
 *                     example: United States
 *                   city:
 *                     type: string
 *                     description: Job city
 *                     example: San Francisco
 *               description:
 *                 type: string
 *                 description: Job description
 *                 example: We are looking for a senior software engineer...
 *               applicationDeadline:
 *                 type: string
 *                 format: date-time
 *                 description: Application deadline
 *                 example: 2024-12-31T23:59:59.000Z
 *     responses:
 *       201:
 *         description: Job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 job:
 *                   $ref: '#/components/schemas/Job'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const createJob = async (req, res) => {
  const { title, company, jobType, jobLocation, description } = req.body;
  if (!title || !company || !jobType || !jobLocation || !description) {
    throw new BadRequestError("Please provide all required job fields");
  }
  req.body.createdBy = req.user.userId;
  const job = await JobModal.create(req.body);
  res.status(StatusCodes.CREATED).json({ job });
};

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   delete:
 *     summary: Delete a job posting
 *     tags: [Jobs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: job deleted Successfully
 *       400:
 *         description: Bad request - job not found
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
export const deleteJob = async (req, res) => {
  const { id: jobId } = req.params;
  const job = await JobModal.findById(jobId);
  if(!job){
    throw new BadRequestError("Job not found");
  }
  checkPermissions(req.user,job.createdBy)
  await job.remove();
  res.status(StatusCodes.OK).json({ msg: 'job deleted Successfully'});
};

/**
 * @swagger
 * /api/v1/jobs:
 *   get:
 *     summary: Get all jobs for the authenticated user
 *     tags: [Jobs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for job position, company, or title
 *         example: software engineer
 *       - in: query
 *         name: jobStatus
 *         schema:
 *           type: string
 *           enum: [pending, interview, declined, all]
 *         description: Filter by job status
 *         example: pending
 *       - in: query
 *         name: jobType
 *         schema:
 *           type: string
 *           enum: [full-time, part-time, internship, all]
 *         description: Filter by job type
 *         example: full-time
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, a-z, z-a]
 *         description: Sort order
 *         example: newest
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of jobs per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalJobs:
 *                   type: integer
 *                   description: Total number of jobs
 *                   example: 25
 *                 numOfPages:
 *                   type: integer
 *                   description: Total number of pages
 *                   example: 3
 *                 currentPage:
 *                   type: integer
 *                   description: Current page number
 *                   example: 1
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getAllJobs = async (req, res) => {
  const { search, jobStatus, jobType, sort,title } = req.query;

  const queryObject = {
    createdBy: req.user.userId, 
  };

  if (search) {
    queryObject.$or = [
      { position: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
    ];
  }

  if (jobStatus && jobStatus !== 'all') {
    queryObject.jobStatus = jobStatus;
  }
  if (jobType && jobType !== 'all') {
    queryObject.jobType = jobType;
  }

  const sortOptions = {
    newest: '-createdAt',
    oldest: 'createdAt',
    'a-z': 'position',
    'z-a': '-position',
  };

  const sortKey = sortOptions[sort] || sortOptions.newest;

  // setup pagination

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const jobs = await JobModal.find(queryObject)
    .sort(sortKey)
    .skip(skip)
    .limit(limit);
  console.log({jobs});
  
  const totalJobs = await JobModal.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalJobs / limit);
  res
    .status(StatusCodes.OK)
    .json({ totalJobs, numOfPages, currentPage: page, jobs });
};

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   get:
 *     summary: Get a specific job by ID
 *     tags: [Jobs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Job retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 job:
 *                   $ref: '#/components/schemas/Job'
 *       401:
 *         description: Unauthorized - invalid token or insufficient permissions
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
export const getJob = async (req, res) => {
  const job = await JobModal.findById(req.params.id);
  if (!job) throw new NotFoundError('Job not found');
  checkPermissions(req.user, job.createdBy);
  res.status(StatusCodes.OK).json({ job });
};

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   patch:
 *     summary: Update a job posting
 *     tags: [Jobs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Job title
 *                 example: Senior Software Engineer
 *               company:
 *                 type: string
 *                 description: Company name
 *                 example: Tech Corp
 *               position:
 *                 type: string
 *                 description: Job position
 *                 example: Software Engineer
 *               jobStatus:
 *                 type: string
 *                 enum: [pending, interview, declined]
 *                 description: Job status
 *                 example: pending
 *               jobType:
 *                 type: string
 *                 enum: [full-time, part-time, internship]
 *                 description: Type of job
 *                 example: full-time
 *               jobLocation:
 *                 type: object
 *                 properties:
 *                   country:
 *                     type: string
 *                     description: Job country
 *                     example: United States
 *                   city:
 *                     type: string
 *                     description: Job city
 *                     example: San Francisco
 *               description:
 *                 type: string
 *                 description: Job description
 *                 example: We are looking for a senior software engineer...
 *               applicationDeadline:
 *                 type: string
 *                 format: date-time
 *                 description: Application deadline
 *                 example: 2024-12-31T23:59:59.000Z
 *     responses:
 *       200:
 *         description: Job updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Job updated successfully
 *                 job:
 *                   $ref: '#/components/schemas/Job'
 *       401:
 *         description: Unauthorized - invalid token or insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Job not found or permission denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const updateJob = async (req, res) => {
  // sanitize
  delete req.body.createdBy;
  delete req.body._id;
  const job = await JobModal.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user.userId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!job) throw new NotFoundError("Job not found or permission denied");

  res.status(StatusCodes.OK).json({ msg: "Job updated successfully", job });
};

/**
 * @swagger
 * /api/v1/jobs/{id}/apply:
 *   post:
 *     summary: Apply for a job
 *     tags: [Jobs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - cv
 *             properties:
 *               cv:
 *                 type: string
 *                 format: binary
 *                 description: CV file (PDF, DOC, DOCX)
 *               coverLetter:
 *                 type: string
 *                 description: Cover letter text
 *                 example: I am excited to apply for this position...
 *               portfolio:
 *                 type: string
 *                 description: Portfolio URL
 *                 example: https://portfolio.example.com
 *               linkedInProfile:
 *                 type: string
 *                 description: LinkedIn profile URL
 *                 example: https://linkedin.com/in/johndoe
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Applicant skills
 *                 example: ["JavaScript", "React", "Node.js"]
 *               experienceLevel:
 *                 type: string
 *                 enum: [beginner, intermediate, expert]
 *                 description: Experience level
 *                 example: intermediate
 *               availability:
 *                 type: string
 *                 description: Availability information
 *                 example: Available immediately
 *               locationPreferences:
 *                 type: string
 *                 description: Location preferences
 *                 example: Remote or San Francisco
 *               references:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Professional references
 *     responses:
 *       201:
 *         description: Job application submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Successfully applied for the job
 *                 application:
 *                   $ref: '#/components/schemas/JobApplication'
 *       400:
 *         description: Bad request - validation error, job closed, or already applied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid token
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
export const applyForJob = async (req, res) => {
  const { id } = req.params;

  const {
    coverLetter,
    portfolio,
    linkedInProfile,
    skills,
    experienceLevel,
    availability,
    locationPreferences,
    references,
  } = req.body;

  if (!req?.file) {
    throw new BadRequestError("Please attach your cv");
  }

  const job = await JobModal.findById(id).lean();
  if (!job) {
    throw new NotFoundError("Job not found");
  }
  if(job.isClosed){
     throw new BadRequestError("This job is no longer accepting applications.");
  }
  if (job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now()) {
  throw new BadRequestError("The application deadline for this job has passed");
}
  const existingApplication = await JobApplicationModal.findOne({
    talent: req.user.userId,
    job: id,
  });

  if (existingApplication) {
    if (existingApplication.status === "rejected") {
      throw new BadRequestError(
        "You have already been rejected for this job and cannot reapply."
      );
    } else {
      throw new BadRequestError("You have already applied for this job");
    }
  }

  const cvPath = `/uploads/cvs/${req?.file.filename}`; 
  // const portfolioPath = portfolio
  //   ? `/uploads/portfolio/${portfolio.filename}`
  //   : null;
  const portfolioPath = portfolio || null;


  const newApplication = await JobApplicationModal.create({
    job: id,
    Jobtitle: job?.title,
    talent: req.user.userId,
    coverLetter: coverLetter || "",
    cv: cvPath || "",
    portfolio: portfolioPath,
    linkedInProfile: linkedInProfile || "",
    skills: skills || [],
    experienceLevel: experienceLevel || "beginner",
    availability: availability || "",
    locationPreferences: locationPreferences || "",
    references: references || [],
  });

  await JobModal.findByIdAndUpdate(id, {
    $push: {
      applicants: {
        talent: req.user.userId,
        job: id,
        resume: cvPath || "",
        status: "pending",
        appliedAt: new Date(),
      },
    },
  });
  res.status(StatusCodes.CREATED).json({
    msg: "Successfully applied for the job",
    application: newApplication,
  });
};

/**
 * @swagger
 * /api/v1/jobs/my-applications:
 *   get:
 *     summary: Get current user's job applications
 *     tags: [Jobs]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Job applications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 appliedJobs:
 *                   type: integer
 *                   description: Total number of applications
 *                   example: 5
 *                 applications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       applicationId:
 *                         type: string
 *                         description: Application ID
 *                         example: 507f1f77bcf86cd799439011
 *                       status:
 *                         type: string
 *                         enum: [pending, under review, shortlisted, interview, rejected]
 *                         description: Application status
 *                         example: pending
 *                       appliedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Application date
 *                       job:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Job ID
 *                             example: 507f1f77bcf86cd799439011
 *                           title:
 *                             type: string
 *                             description: Job title
 *                             example: Senior Software Engineer
 *                           company:
 *                             type: string
 *                             description: Company name
 *                             example: Tech Corp
 *                           location:
 *                             type: string
 *                             description: Job location
 *                             example: San Francisco, CA
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const myApplications = async (req, res) => {
  const userId = req.user.userId;
  const appliedJobs = await JobApplicationModal.find({ talent: userId }).populate(
    "job",
    "position company jobLocation"
  );
  res.status(StatusCodes.OK).json({
    success: true,
    appliedJobs:appliedJobs?.length,
    applications: appliedJobs.map((app) => ({
      applicationId: app._id,
      status: app.status,
      appliedAt: app.appliedAt,
      job: {
        id: app.job?._id,
        title: app.job?.position || "",
        company: app.job?.company || "",
        location: app.job?.jobLocation || "Not specified", // Show 'Not specified' if empty
      },
    })),
  });
};

/**
 * @swagger
 * /api/v1/jobs/{jobId}/close:
 *   patch:
 *     summary: Close a job for applications
 *     tags: [Jobs]
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
 *         description: Job closed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Job closed for applications
 *       401:
 *         description: Unauthorized - invalid token or insufficient permissions
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
export const closeJob = async (req, res) => {
  const job = await JobModal.findById(req.params.jobId);
  if (!job) throw new NotFoundError("Job not found");
  checkPermissions(req.user, job.createdBy);
  job.isClosed = true;
  await job.save();
  res.status(StatusCodes.OK).json({ msg: "Job closed for applications" });
};