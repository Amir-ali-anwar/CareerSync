import mongoose from "mongoose";
import { AI_PROCESSING_STATUS } from "../utils/constants.js";

// AI-inferred, normalized job intelligence - the Job-side counterpart to
// CandidateProfile. Deliberately does NOT duplicate fields Job already captures
// reliably from the employer (jobLocation, workMode, jobType, salaryRange): this only
// holds signal derived from free-text `description` that Job's own structured fields
// don't give you - normalized/aliased skills, inferred seniority, domains, and a short
// responsibilities summary.
//
// IDENTITY & VERSIONING (services/job/jobIntelligenceService.js, mirrors the decision
// already made for CandidateProfile): exactly one JobProfile per Job (unique index
// below). Reprocessing - triggered on job creation and again whenever `description` is
// part of a job update - OVERWRITES this same document's fields and increments
// `profileVersion`. It does not fork a new profile.
//
// STALENESS: `sourceDescriptionHash` records a hash of the exact `description` text this
// profile was generated from. A consumer can compare it against a fresh hash of the
// current `Job.description` to detect drift if, for any reason, `processingStatus`
// wasn't correctly reset (defense in depth - the normal path already resets status to
// "pending" on every description-changing update).
const JobProfileSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      unique: true,
    },
    normalizedTitle: {
      type: String,
      default: null,
    },
    seniority: {
      type: String,
      enum: ["entry", "mid", "senior", "lead", null],
      default: null,
    },
    skills: {
      type: [String],
      default: [],
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    preferredSkills: {
      type: [String],
      default: [],
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
      default: null,
    },
    education: {
      type: [String],
      default: [],
    },
    certifications: {
      type: [String],
      default: [],
    },
    domains: {
      type: [String],
      default: [],
    },
    responsibilities: {
      type: [String],
      default: [],
    },
    processingStatus: {
      type: String,
      enum: Object.values(AI_PROCESSING_STATUS),
      default: AI_PROCESSING_STATUS.PENDING,
    },
    profileVersion: {
      type: Number,
      default: 0,
    },
    sourceDescriptionHash: {
      type: String,
      default: null,
    },
    embedding: {
      type: [Number],
      default: undefined,
      select: false,
    },
    embeddingMetadata: {
      sourceType: String,
      sourceId: String,
      sourceVersion: Number,
      embeddingModel: String,
      embeddingVersion: String,
      dimensions: Number,
      contentHash: String,
      generatedAt: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("JobProfile", JobProfileSchema);
