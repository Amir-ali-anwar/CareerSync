import mongoose from "mongoose";

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
      enum: ['pending', 'under review', 'shortlisted', 'interview', 'rejected'],
      default: 'pending',
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
  },
  { timestamps: true }
);

export default mongoose.model('JobApplication', JobApplicationSchema);
