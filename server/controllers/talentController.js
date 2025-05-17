import JobModal from "../models/JobsModal.js";
import JobApplicationModal from "../models/JobApplicationModal.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";

export const getAllTalents = async (req, res) => {
  const employerId = req.user.userId;
  const employerJobs = await JobModal.find({ createdBy: employerId }).select('_id');
  const employerJobIds = employerJobs.map(job => job._id);
  const applications = await JobApplicationModal.find({ job: { $in: employerJobIds } })
  if(applications.length===0) return  res.status(StatusCodes.OK).json({msg:"No Applicants found" });
   res.status(StatusCodes.OK).json({ applications });
};

// export const getTalentById=async(req,res)=>{
//   const {talentId}= req.params
//   const talent = await JobApplicationModal.find({talent:talentId}).populate('job')
//   res.status(StatusCodes.OK).json({ talent });
// }