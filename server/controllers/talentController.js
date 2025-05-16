import JobModal from "../models/JobsModal.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";

export const getAllTalents =async (req,res) => {
  const employerId = req.user.userId;

    const employerJobs = await JobModal.find()

  console.log(employerJobs);
  
  //  checkPermissions(req.user, job.createdBy._id);
   res.status(StatusCodes.OK).json({employerJobs});
  
   
};
