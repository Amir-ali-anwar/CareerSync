import mongoose from "mongoose";
import { JOB_STATUS, JOB_TYPE } from "../utils/constants.js";

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
