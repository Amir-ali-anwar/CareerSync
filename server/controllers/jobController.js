import JobModal from "../models/JobsModal.js";
import { StatusCodes } from "http-status-codes";
import {BadRequestError} from "../errors/index.js";
import {checkPermissions} from "../middlewares/permissions.js";
export const createJob = async (req, res) => {
  const { title, company, jobType, location, description } = req.body;
  if (!title || !company || !jobType || !location || !description) {
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
  const { search, jobStatus, jobType, sort } = req.query;

  const queryObject = {
    createdBy: req.user.userId,
  };

  if (search) {
    queryObject.$or = [
      { position: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
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
