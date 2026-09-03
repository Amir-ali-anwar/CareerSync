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
