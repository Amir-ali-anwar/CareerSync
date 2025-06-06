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
        country: String,
        city: String,
      },
      default: { country: "", city: "" },
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

    applicants: [
      {
        talent: {
          type: mongoose.Types.ObjectId,
          ref: "User",
        },
        job: {
          type: mongoose.Types.ObjectId,
          ref: "Job",
        },
        status: {
          type: String,
          enum: ["pending", "shortlisted", "rejected"],
          default: "pending",
        },
        appliedAt: {
          type: Date,
          default: Date.now,
        },
        resume: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Job", JobSchema);
