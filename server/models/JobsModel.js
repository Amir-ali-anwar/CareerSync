import mongoose from "mongoose";
import { JOB_STATUS, JOB_TYPE, WORK_MODE, AI_PROCESSING_STATUS } from "../utils/constants.js";

const JobSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      required: true,
      trim: true,
    },
    jobStatus: {
      type: String,
      enum: Object.values(JOB_STATUS),
      default: JOB_STATUS.PENDING,
    },
    jobType: {
      type: String,
      enum: Object.values(JOB_TYPE),
      default: JOB_TYPE.FULL_TIME,
    },
    jobLocation: {
      type: {
        country: { type: String, required: true },
        city: { type: String, required: true },
      },
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    applicationDeadline: {
      type: Date,
      default: null,
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // --- Structured fields for AI matching (all optional - existing jobs created
    // before these fields existed remain fully valid with no data migration needed).
    // Free-text detail continues to live in `description`; these are only the
    // normalized signals the future matching engine (skill/experience/work-mode
    // scoring) needs to compare directly against a CandidateProfile, without having
    // to parse `description` on every match.
    requiredSkills: {
      type: [String],
      default: [],
    },
    preferredSkills: {
      type: [String],
      default: [],
    },
    // Years of professional experience expected for this role (not a 0-5 "level" enum).
    requiredExperience: {
      type: Number,
      min: 0,
    },
    workMode: {
      type: String,
      enum: Object.values(WORK_MODE),
    },
    salaryRange: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      currency: { type: String, default: "USD" },
    },

    // Claim/idempotency guard for services/job/jobIntelligenceService.js - mirrors
    // JobApplication.resumeProcessingStatus's pattern exactly. Reset to "pending"
    // whenever an update includes a new `description`, so a stale JobProfile is
    // reliably reprocessed rather than silently treated as current.
    intelligenceProcessingStatus: {
      type: String,
      enum: Object.values(AI_PROCESSING_STATUS),
      default: AI_PROCESSING_STATUS.PENDING,
    },
    intelligenceProcessingError: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// getAllJobs/getJob/updateJob/deleteJob all filter or verify ownership by createdBy -
// without this, every employer-scoped listing is a full collection scan.
JobSchema.index({ createdBy: 1 });

// searchJobs (the talent-facing browse endpoint) always filters `isClosed: false` plus
// an applicationDeadline range/null check; a compound index lets Mongo narrow on both
// in a single index scan instead of collection-scanning past every closed/expired job.
JobSchema.index({ isClosed: 1, applicationDeadline: 1 });

export default mongoose.model("Job", JobSchema);
