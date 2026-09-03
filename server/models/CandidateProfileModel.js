import mongoose from "mongoose";
import { AI_PROCESSING_STATUS } from "../utils/constants.js";

// A candidate's cross-job, evolving profile - distinct from JobApplication, which stays
// a point-in-time snapshot of what was submitted for one specific job. This is what
// future matching/recommendations/semantic search/resume analysis reads from, since
// those operate on "this candidate in general," not "this one application."
//
// IDENTITY & VERSIONING DECISION (services/resume/resumeProcessingService.js): exactly
// one CandidateProfile per user (enforced by the unique index below). A new resume
// upload does NOT create a new profile or a new profile document - it OVERWRITES this
// same profile's extracted fields with the latest result and increments
// `profileVersion`. `resumeMetadata.sourceApplicationId` always points at whichever
// application's CV most recently produced the current data. Rationale: this profile
// represents "the current best-known state of this candidate," which is what matching/
// search/recommendations should read - not a historical archive of every past resume.
// If a real audit trail of prior versions is ever needed, that's a deliberate future
// addition (e.g. a separate CandidateProfileHistory collection), not implied by
// `profileVersion` being a plain counter here.
//
// Deliberately lean otherwise (see AI Career Intelligence Roadmap in TASKS.md):
// embedding storage is intentionally NOT included here yet - that's a separate, later
// phase, once there's an actual embedding pipeline to populate it.
const CandidateProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    education: [
      {
        degree: { type: String, trim: true },
        field: { type: String, trim: true },
        institution: { type: String, trim: true },
        graduationYear: Number,
      },
    ],
    certifications: {
      type: [String],
      default: [],
    },
    // Industry/domain signals extracted from the resume (e.g. "Fintech", "Healthcare") -
    // the candidate-side counterpart to JobProfile.domains, added for Module E's domain
    // matching dimension (services/matching/matchers/domainMatcher.js). Uses the exact
    // same extractDomainsHeuristic already built for job descriptions - no duplicate logic.
    domains: {
      type: [String],
      default: [],
    },
    preferredRoles: {
      type: [String],
      default: [],
    },
    preferredLocations: {
      type: [String],
      default: [],
    },
    workModePreference: {
      type: String,
      enum: ["remote", "hybrid", "onsite", "any"],
      default: "any",
    },
    // Extracted plain text from the candidate's most recent resume - the input the
    // future resume-parsing/embedding pipeline (Phase 6) operates on. Not the raw
    // uploaded file itself (that stays in CV storage, see utils/cvStorage.js); this is
    // derived, regenerable text. `select: false` because it can be large and most
    // reads of a profile (e.g. displaying preferences) don't need it, mirroring the
    // same select:false pattern already used for User.password.
    resumeText: {
      type: String,
      select: false,
    },
    resumeMetadata: {
      sourceApplicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobApplication",
      },
      fileName: String,
      extractedAt: Date,
    },
    // Status of the most recent resume-processing run (see resumeProcessingService.js),
    // kept in sync with that same run's JobApplication.resumeProcessingStatus.
    processingStatus: {
      type: String,
      enum: Object.values(AI_PROCESSING_STATUS),
      default: AI_PROCESSING_STATUS.PENDING,
    },
    // Increments each time a resume-processing run successfully overwrites this
    // profile's extracted fields - a simple change counter, not a version history.
    profileVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("CandidateProfile", CandidateProfileSchema);
