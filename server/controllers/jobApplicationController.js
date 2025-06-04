import JobModal from "../models/JobsModal.js";
import JobApplicationModal from "../models/JobApplicationModal.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError,NotFoundError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";
const VALID_STATUSES = ['pending', 'under review', 'shortlisted', 'interview', 'rejected'];
const ALLOWED_WITHDRAW_STATUSES = ['pending', 'under review'];

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
  const application = await JobApplicationModal.findOne({
    job: jobId,
    talent: applicantId,
  });

  if (!application) {
    throw new NotFoundError("Job application not found");
  }
  const job = await JobModal.findById(jobId).populate("createdBy");
  checkPermissions(req.user, job.createdBy._id);

  application.status = status;
  await application.save();
  res
    .status(StatusCodes.OK)
    .json({ message: "Application status updated successfully", status });
};

export const withdrawApplication = async (req, res) => {
  const { id: applicationId } = req.params;
  const application = await JobApplicationModal.findById(applicationId);


  checkPermissions(req.user.userId,application.talent)
  if (!ALLOWED_WITHDRAW_STATUSES.includes(application.status)) {
    throw new BadRequestError(
      "You cannot withdraw after decision has been made"
    );
  }

  application.status = "withdrawn";
  await application.save();
  res
    .status(StatusCodes.OK)
    .json({ msg: "Application withdrawn successfully" });
};