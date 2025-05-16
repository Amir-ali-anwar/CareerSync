import JobModal from "../models/JobsModal.js";
import JobApplicationModal from "../models/JobApplicationModal.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError,NotFoundError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";

export const getJobApplications = async (req, res) => {
  const { jobId } = req.params;
  const jobApplicants = await JobApplicationModal.find({ job: jobId })
    .populate("talent")
    .populate({
      path: "job",
      populate: {
        path: "createdBy", 
        model: "User",
        select: "name email role",
      },
    });
  if (!jobApplicants || jobApplicants.length === 0) {
    return res.status(404).json({ error: "No job applications found." });
  }
const job = jobApplicants[0].job;

  if (!job || !job.createdBy) {
    return res.status(404).json({ error: "Job or creator info not found." });
  }

  checkPermissions(req.user, job.createdBy._id);
  res.status(StatusCodes.OK).json({ msg: jobApplicants });
};

export const updateApplicationStatus = async (req, res) => {
  const { jobId, applicantId } = req.params;
  const { status } = req.body;
  if (!["pending", "shortlisted", "rejected", "hired"].includes(status)) {
    throw new BadRequestError("Invalid status");
  }
  const job = JobApplicationModal.findById({ job: jobId });
  console.log({ job });
  if (!job) throw new NotFoundError("Job not found");
};
