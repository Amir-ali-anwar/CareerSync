import JobModal from "../models/JobsModal.js";
import JobApplicationModal from "../models/JobApplicationModal.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError,NotFoundError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";
const VALID_STATUSES = ['pending', 'under review', 'shortlisted', 'interview', 'rejected'];

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
   if (!VALID_STATUSES.includes(status)) {
    throw new BadRequestError("Invalid application status");
  }
  const job = await JobModal.findById(jobId);

  if (!job) throw new NotFoundError("Job not found");

  const applicant = job?.applicants?.find(
    (app) => app.talent.toString() === applicantId
  );
  if (!applicant) {
    throw new NotFoundError("Applicant not found for this job");
  }
  await job.save();
  res
    .status(StatusCodes.OK)
    .json({ message: "Application status updated successfully", status });
};
