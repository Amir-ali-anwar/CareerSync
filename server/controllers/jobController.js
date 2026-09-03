import mongoose from "mongoose";
import JobModal from "../models/JobsModel.js";
import JobApplicationModal from '../models/JobApplicationModel.js'
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";

// Standalone MongoDB deployments (local dev, mongodb-memory-server's default single-node
// mode) reject multi-document transactions outright; only a replica set/mongos (which
// Atlas always is) supports them. Matches the error MongoDB raises in that case so we can
// fall back to a plain sequential delete instead of crashing on unsupported environments.
const isTransactionsUnsupportedError = (error) =>
  /Transaction numbers are only allowed on a replica set member or mongos|Transactions are not supported/i.test(
    error?.message || ""
  );

const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  const { title, company, jobType, jobLocation, description, applicationDeadline } = req.body;
  if (!title || !company || !jobType || !jobLocation || !description) {
    throw new BadRequestError("Please provide all required job fields");
  }
  if (!jobLocation.country || !jobLocation.city) {
    throw new BadRequestError("Job location must include country and city");
  }
  if (applicationDeadline !== undefined && applicationDeadline !== null) {
    const deadlineDate = new Date(applicationDeadline);
    if (isNaN(deadlineDate.getTime())) {
      throw new BadRequestError("Application deadline must be a valid date");
    }
    if (deadlineDate.getTime() < Date.now()) {
      throw new BadRequestError("Application deadline cannot be in the past");
    }
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
  if (!job) {
    throw new NotFoundError("Job not found");
  }
  checkPermissions(req.user, job.createdBy)

  // Delete the job and its applications atomically where the deployment supports it
  // (any real replica set, including MongoDB Atlas) so a crash mid-delete can never
  // orphan application records. Standalone MongoDB (local dev, mongodb-memory-server's
  // default mode) can't run transactions, so those environments fall back to the
  // previous sequential behavior instead of failing outright.
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await JobApplicationModal.deleteMany({ job: jobId }, { session });
      await job.deleteOne({ session });
    });
  } catch (error) {
    if (!isTransactionsUnsupportedError(error)) {
      throw error;
    }
    await JobApplicationModal.deleteMany({ job: jobId });
    await job.deleteOne();
  } finally {
    await session.endSession();
  }

  res.status(StatusCodes.OK).json({ msg: 'job deleted Successfully' });
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
  const { search, jobStatus, jobType, sort, title } = req.query;

  const queryObject = {
    createdBy: req.user.userId,
  };

  if (search) {
    const safeSearch = escapeRegex(search);
    queryObject.$or = [
      { position: { $regex: safeSearch, $options: 'i' } },
      { company: { $regex: safeSearch, $options: 'i' } },
      { title: { $regex: safeSearch, $options: 'i' } },
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

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.max(Number(req.query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const jobs = await JobModal.find(queryObject)
    .sort(sortKey)
    .skip(skip)
    .limit(limit);

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

  if (req.body.jobLocation && (!req.body.jobLocation.country || !req.body.jobLocation.city)) {
    throw new BadRequestError("Job location must include country and city");
  }
  if (req.body.applicationDeadline !== undefined && req.body.applicationDeadline !== null) {
    const deadlineDate = new Date(req.body.applicationDeadline);
    if (isNaN(deadlineDate.getTime())) {
      throw new BadRequestError("Application deadline must be a valid date");
    }
  }

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
  if (job.isClosed) {
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
  const portfolioPath = portfolio || null;


  let newApplication;

  try {
    const createdApplications = await JobApplicationModal.create([
      {
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
      },
    ]);
    newApplication = createdApplications[0];
  } catch (error) {
    if (error.code === 11000) {
      throw new BadRequestError("You have already applied for this job");
    }
    throw error;
  }

  res.status(StatusCodes.CREATED).json({
    msg: "Successfully applied for the job",
    application: newApplication,
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

/**
 * @swagger
 * /api/v1/jobs/search:
 *   get:
 *     summary: Browse and search open jobs (talent-facing)
 *     tags: [Jobs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for job title, position, or company
 *         example: backend developer
 *       - in: query
 *         name: jobType
 *         schema:
 *           type: string
 *           enum: [full-time, part-time, internship, all]
 *         description: Filter by job type
 *         example: full-time
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *         example: United States
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
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Jobs per page
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
 *                   example: 42
 *                 numOfPages:
 *                   type: integer
 *                   example: 5
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 */
export const searchJobs = async (req, res) => {
  const { search, jobType, country, sort } = req.query;

  const queryObject = {
    isClosed: false,
  };

  // Exclude jobs whose deadline has passed
  queryObject.$or = [
    { applicationDeadline: null },
    { applicationDeadline: { $gt: new Date() } },
  ];

  if (search) {
    const safeSearch = escapeRegex(search);
    queryObject.$and = [
      {
        $or: [
          { title: { $regex: safeSearch, $options: 'i' } },
          { position: { $regex: safeSearch, $options: 'i' } },
          { company: { $regex: safeSearch, $options: 'i' } },
          { description: { $regex: safeSearch, $options: 'i' } },
        ],
      },
    ];
  }

  if (jobType && jobType !== 'all') {
    queryObject.jobType = jobType;
  }

  if (country) {
    queryObject['jobLocation.country'] = { $regex: escapeRegex(country), $options: 'i' };
  }

  const sortOptions = {
    newest: '-createdAt',
    oldest: 'createdAt',
    'a-z': 'title',
    'z-a': '-title',
  };
  const sortKey = sortOptions[sort] || sortOptions.newest;

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.max(Number(req.query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const jobs = await JobModal.find(queryObject)
    .sort(sortKey)
    .skip(skip)
    .limit(limit);

  const totalJobs = await JobModal.countDocuments(queryObject);
  const numOfPages = Math.ceil(totalJobs / limit);

  res.status(StatusCodes.OK).json({ totalJobs, numOfPages, currentPage: page, jobs });
};