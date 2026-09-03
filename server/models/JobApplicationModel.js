import mongoose from "mongoose";
import { AI_PROCESSING_STATUS } from "../utils/constants.js";

const JobApplicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
    },
    talent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'under review', 'shortlisted', 'interview', 'rejected', 'withdrawn'],
      default: 'pending',
    },
    Jobtitle: {
      type: String
    },
    cv: {
      type: String,
      required: true,
    },
    coverLetter: {
      type: String,
    },
    portfolio: {
      type: String,
    },
    linkedInProfile: {
      type: String,
    },
    skills: {
      type: [String],
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert'],
      default: 'beginner',
    },
    availability: {
      type: String,
    },
    locationPreferences: {
      type: String,
    },
    references: {
      type: [String],
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },

    // Tracks the AI resume-processing pipeline for THIS submission's CV (see
    // services/resume/resumeProcessingService.js). Kept separate from `status` (the
    // recruiter-facing application status) - this is purely about whether the candidate
    // intelligence extraction succeeded, not whether the employer has reviewed anything.
    resumeProcessingStatus: {
      type: String,
      enum: Object.values(AI_PROCESSING_STATUS),
      default: AI_PROCESSING_STATUS.PENDING,
    },
    // Set only when resumeProcessingStatus is "failed" - a short, non-sensitive reason
    // (never the CV contents or extracted text) for support/debugging purposes.
    resumeProcessingError: {
      type: String,
    },
  },
  { timestamps: true }
);

// Enforces "one application per talent per job" and, as a side effect, already covers
// lookups filtered by `job` alone (getJobApplications) since job is the index prefix.
JobApplicationSchema.index({ job: 1, talent: 1 }, { unique: true });

// getMyApplications filters by `talent` alone, which the compound index above can't
// serve efficiently (talent isn't its prefix field) - needs its own index.
JobApplicationSchema.index({ talent: 1 });

export default mongoose.model('JobApplication', JobApplicationSchema);
