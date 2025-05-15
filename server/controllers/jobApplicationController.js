import JobModal from "../models/JobsModal.js";
import JobApplicationModal from '../models/JobApplicationModal.js'
import { StatusCodes } from "http-status-codes";
import {BadRequestError} from "../errors/index.js";
import {checkPermissions} from "../middlewares/permissions.js";

export const getJobApplications= async(req,res)=>{
    const {jobId}= req.params
    const jobApplicants= await JobApplicationModal.find({job:jobId}).populate('talent')
    
     res.status(StatusCodes.OK).json({ msg: jobApplicants});
}