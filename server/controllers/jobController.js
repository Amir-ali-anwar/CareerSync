import JobModal from "../models/JobsModal.js";
import JobApplicationModal from '../models/JobApplicationModal.js'
import { StatusCodes } from "http-status-codes";
import {BadRequestError} from "../errors/index.js";
import {checkPermissions} from "../middlewares/permissions.js";
export const createJob = async (req, res) => {
  const { title, company, jobType, jobLocation, description } = req.body;
  if (!title || !company || !jobType || !jobLocation || !description) {
    throw new BadRequestError("Please provide all required job fields");
  }
  req.body.createdBy = req.user.userId;
  const job = await JobModal.create(req.body);
  res.status(StatusCodes.CREATED).json({ job });
};


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


export const getJob = async (req, res) => {
  const job = await JobModal.findById(req.params.id);
  if (!job) throw new NotFoundError('Job not found');
  checkPermissions(req.user, job.createdBy);
  res.status(StatusCodes.OK).json({ job });
};


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


export const applyForJob = async (req, res) => {
  const  {id}  = req.params;

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

  const job = await JobModal.findById(id);
  console.log({job});
  
  if (!job) {
    throw new BadRequestError("Please provide all required job fields");
  }

  const existingApplication = await JobApplicationModal.findOne({
    talent: req.user.userId,
    job: id,
  });
  if (existingApplication) {
    throw new BadRequestError("You have already applied for this job");
  }

  const cvPath = `/uploads/cvs/${req?.file.filename}`; // Example path
  const portfolioPath = portfolio
    ? `/uploads/portfolio/${portfolio.filename}`
    : null;

  const newApplication = await JobApplicationModal.create({
    job: id,
    Jobtitle:job?.title,
    talent: req.user.userId,
    coverLetter: coverLetter || "",
    cv: cvPath || '',
    portfolio: portfolioPath,
    linkedInProfile: linkedInProfile || "",
    skills: skills || [],
    experienceLevel: experienceLevel || "beginner",
    availability: availability || "",
    locationPreferences: locationPreferences || "",
    references: references || [],
  });
  res
    .status(StatusCodes.CREATED)
    .json({
      msg: "Successfully applied for the job",
      application: newApplication,
    });
};


export const myApplications = async (req, res) => {
  const userId = req.user.userId;
  const appliedJobs = await JobApplicationModal.find({ user: userId }).populate(
    "job",
    "position company jobLocation"
  );
  console.log(appliedJobs);
  res.status(StatusCodes.OK).json({
    success: true,
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



