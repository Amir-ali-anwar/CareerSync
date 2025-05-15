import JobModal from "../models/JobsModal.js";
import JobApplicationModal from "../models/JobApplicationModal.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";

export const getJobApplications = async (req, res) => {
  const { jobId } = req.params;
  const jobApplicants = await JobApplicationModal.find({ job: jobId })
    .populate("talent")
    .populate({
      path: "job",
      populate: {
        path: "createdBy", // populate the job creator (employer)
        model: "User",
        select: "name email role", // optional: only return needed fields
      },
    });
  if (!jobApplicants || jobApplicants.length === 0) {
    return res.status(404).json({ error: "No job applications found." });
  }
const job = jobApplicants[0].job;

  if (!job || !job.createdBy) {
    return res.status(404).json({ error: "Job or creator info not found." });
  }

  // ✅ Use your custom permission check here
  checkPermissions(req.user, job.createdBy._id);
  res.status(StatusCodes.OK).json({ msg: jobApplicants });
};

export const applicationStatus = async (req, res) => {
  const { jobId, applicantId } = req.params;
};
