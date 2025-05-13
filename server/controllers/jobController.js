import Job from "../models/JobsModal.js";
import { StatusCodes } from "http-status-codes";
import {BadRequestError} from "../errors/index.js";
export const createJob = async (req, res) => {
  const { title, company, jobType, location, description } = req.body;
  if (!title || !company || !jobType || !location || !description) {
    throw new BadRequestError("Please provide all required job fields");
  }
  req.body.createdBy = req.user.userId;
  const job = await Job.create(req.body);
  res.status(StatusCodes.CREATED).json({ job });
};
