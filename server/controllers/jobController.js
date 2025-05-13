import Job from '../models/JobModel.js';
import { StatusCodes } from 'http-status-codes';

export const createJob = async (req, res) => {
    req.body.createdBy = req.user.userId;
    const job = await Job.create(req.body);
    res.status(StatusCodes.CREATED).json({ job });
};




