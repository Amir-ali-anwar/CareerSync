import JobApplicationModel from "../../models/JobApplicationModel.js";
import CandidateProfileModel from "../../models/CandidateProfileModel.js";
import aiService from "../ai/index.js";
import { extractTextFromCv } from "./textExtraction.js";
import { AI_PROCESSING_STATUS } from "../../utils/constants.js";
import logger from "../../utils/logger.js";

/**
 * Orchestrates: CV (via the existing CV storage abstraction) -> text extraction ->
 * AIService.extractResumeProfile -> CandidateProfile persistence, for one job
 * application's submitted CV.
 *
 * IDEMPOTENCY: the very first step atomically claims the application by flipping its
 * resumeProcessingStatus from "pending" to "processing" in a single findOneAndUpdate.
 * If that returns null, another run already claimed (or already finished) this
 * application, so this call is a safe no-op - it will never double-process the same
 * application concurrently, and never create a second CandidateProfile for the same
 * user (CandidateProfile.user has a unique index; this always upserts by that key).
 *
 * FAILURE HANDLING: every failure path (extraction failure, unsupported file type, AI
 * failure, malformed AI response) is caught, recorded as resumeProcessingStatus="failed"
 * with a short non-sensitive reason, and returned as a typed result - nothing throws
 * out of this function, and no partial/corrupt CandidateProfile is ever written (the
 * profile is only touched once a fully-validated AI result is in hand).
 */
const processResumeForApplication = async (applicationId) => {
  const application = await JobApplicationModel.findOneAndUpdate(
    { _id: applicationId, resumeProcessingStatus: AI_PROCESSING_STATUS.PENDING },
    { $set: { resumeProcessingStatus: AI_PROCESSING_STATUS.PROCESSING } },
    { new: true }
  );

  if (!application) {
    logger.info("resume_processing_skipped", {
      applicationId: String(applicationId),
      reason: "application not found or not in pending state (already processed/in-flight)",
    });
    return { status: "skipped" };
  }

  const fail = async (reason) => {
    await JobApplicationModel.findByIdAndUpdate(applicationId, {
      $set: {
        resumeProcessingStatus: AI_PROCESSING_STATUS.FAILED,
        resumeProcessingError: reason,
      },
    });
    // Reflect the failure on the profile too, but only if one already exists - a failed
    // run on a brand-new candidate shouldn't manufacture an otherwise-empty profile.
    await CandidateProfileModel.findOneAndUpdate(
      { user: application.talent },
      { $set: { processingStatus: AI_PROCESSING_STATUS.FAILED } }
    );
    logger.warn("resume_processing_failed", { applicationId: String(applicationId), reason });
    return { status: "failed", reason };
  };

  let extractedText;
  try {
    extractedText = await extractTextFromCv(application.cv);
  } catch (error) {
    return fail(`text_extraction_failed:${error.name}`);
  }

  if (!extractedText) {
    return fail("text_extraction_produced_no_text");
  }

  let extractedProfile;
  try {
    extractedProfile = await aiService.extractResumeProfile(extractedText);
  } catch (error) {
    return fail(`ai_extraction_failed:${error.name}`);
  }

  const updatedProfile = await CandidateProfileModel.findOneAndUpdate(
    { user: application.talent },
    {
      $setOnInsert: { user: application.talent },
      $set: {
        skills: extractedProfile.skills,
        yearsOfExperience: extractedProfile.yearsOfExperience,
        education: extractedProfile.education,
        certifications: extractedProfile.certifications,
        domains: extractedProfile.domains,
        resumeText: extractedText,
        resumeMetadata: {
          sourceApplicationId: application._id,
          fileName: application.cv,
          extractedAt: new Date(),
        },
        processingStatus: AI_PROCESSING_STATUS.COMPLETED,
      },
      $inc: { profileVersion: 1 },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  await JobApplicationModel.findByIdAndUpdate(applicationId, {
    $set: { resumeProcessingStatus: AI_PROCESSING_STATUS.COMPLETED },
    $unset: { resumeProcessingError: "" },
  });

  logger.info("resume_processing_completed", {
    applicationId: String(applicationId),
    talentId: String(application.talent),
    profileVersion: updatedProfile.profileVersion,
  });

  return { status: "completed", candidateProfileId: updatedProfile._id, profileVersion: updatedProfile.profileVersion };
};

/**
 * Fire-and-forget entry point for controllers - mirrors the established pattern for
 * verification emails (see controllers/authController.js's dispatchVerificationEmail):
 * the HTTP response must never wait on CV parsing + an AI call, and a failure here must
 * never surface as a controller-level error. processResumeForApplication already
 * handles its own failures internally; this only guards against a truly unexpected
 * crash (e.g. a dropped DB connection) becoming an unhandled promise rejection.
 */
const triggerResumeProcessing = (applicationId) => {
  processResumeForApplication(applicationId).catch((error) => {
    logger.error("resume_processing_unexpected_error", {
      applicationId: String(applicationId),
      message: error.message,
    });
  });
};

export { processResumeForApplication, triggerResumeProcessing };
