import crypto from "crypto";
import JobModel from "../../models/JobsModel.js";
import JobProfileModel from "../../models/JobProfileModel.js";
import aiService from "../ai/index.js";
import { normalizeSkillList } from "../../utils/normalization.js";
import { AI_PROCESSING_STATUS } from "../../utils/constants.js";
import logger from "../../utils/logger.js";

const hashDescription = (description) =>
  crypto.createHash("sha256").update(description || "").digest("hex");

/**
 * Orchestrates: Job.description -> AIService.extractJobProfile -> JobProfile
 * persistence. Mirrors services/resume/resumeProcessingService.js's structure exactly
 * (same idempotency/failure-handling shape) rather than inventing a new pattern.
 *
 * IDEMPOTENCY: atomically claims the job by flipping Job.intelligenceProcessingStatus
 * from "pending" to "processing" in one findOneAndUpdate. A concurrent/duplicate
 * trigger for the same job is a safe no-op. JobProfile.job has a unique index, so
 * reprocessing always upserts the same document (versioned via profileVersion), never
 * creating a second JobProfile for one job.
 *
 * STALENESS: callers reset Job.intelligenceProcessingStatus to "pending" whenever an
 * update changes `description` (see controllers/jobController.js#updateJob), which
 * makes this function eligible to claim and reprocess again - so a stale JobProfile is
 * never silently treated as current.
 */
const processJobIntelligence = async (jobId) => {
  const job = await JobModel.findOneAndUpdate(
    { _id: jobId, intelligenceProcessingStatus: AI_PROCESSING_STATUS.PENDING },
    { $set: { intelligenceProcessingStatus: AI_PROCESSING_STATUS.PROCESSING } },
    { new: true }
  );

  if (!job) {
    logger.info("job_intelligence_skipped", {
      jobId: String(jobId),
      reason: "job not found or not in pending state (already processed/in-flight)",
    });
    return { status: "skipped" };
  }

  const fail = async (reason) => {
    await JobModel.findByIdAndUpdate(jobId, {
      $set: {
        intelligenceProcessingStatus: AI_PROCESSING_STATUS.FAILED,
        intelligenceProcessingError: reason,
      },
    });
    // Only reflect the failure on an EXISTING profile - a failed first-ever run on a
    // brand-new job shouldn't manufacture an otherwise-empty JobProfile.
    await JobProfileModel.findOneAndUpdate(
      { job: job._id },
      { $set: { processingStatus: AI_PROCESSING_STATUS.FAILED } }
    );
    logger.warn("job_intelligence_failed", { jobId: String(jobId), reason });
    return { status: "failed", reason };
  };

  if (!job.description || !job.description.trim()) {
    return fail("no_description_to_process");
  }

  let extracted;
  try {
    extracted = await aiService.extractJobProfile({
      title: job.title || job.position,
      description: job.description,
    });
  } catch (error) {
    return fail(`ai_extraction_failed:${error.name}`);
  }

  const updatedProfile = await JobProfileModel.findOneAndUpdate(
    { job: job._id },
    {
      $setOnInsert: { job: job._id },
      $set: {
        normalizedTitle: extracted.normalizedTitle,
        seniority: extracted.seniority,
        skills: normalizeSkillList(extracted.skills),
        requiredSkills: normalizeSkillList(extracted.requiredSkills),
        preferredSkills: normalizeSkillList(extracted.preferredSkills),
        yearsOfExperience: extracted.yearsOfExperience,
        education: extracted.education,
        certifications: extracted.certifications,
        domains: extracted.domains,
        responsibilities: extracted.responsibilities,
        processingStatus: AI_PROCESSING_STATUS.COMPLETED,
        sourceDescriptionHash: hashDescription(job.description),
      },
      $inc: { profileVersion: 1 },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  await JobModel.findByIdAndUpdate(jobId, {
    $set: { intelligenceProcessingStatus: AI_PROCESSING_STATUS.COMPLETED },
    $unset: { intelligenceProcessingError: "" },
  });

  logger.info("job_intelligence_completed", {
    jobId: String(jobId),
    profileVersion: updatedProfile.profileVersion,
  });

  return { status: "completed", jobProfileId: updatedProfile._id, profileVersion: updatedProfile.profileVersion };
};

/**
 * Fire-and-forget entry point for controllers - same pattern as
 * services/resume/resumeProcessingService.js's triggerResumeProcessing.
 */
const triggerJobIntelligenceProcessing = (jobId) => {
  processJobIntelligence(jobId).catch((error) => {
    logger.error("job_intelligence_unexpected_error", {
      jobId: String(jobId),
      message: error.message,
    });
  });
};

// Exposed for future consumers (e.g. the matching engine) to defensively detect drift
// without depending on processingStatus alone having been reset correctly.
const isJobProfileStale = (job, jobProfile) => {
  if (!jobProfile) return true;
  return jobProfile.sourceDescriptionHash !== hashDescription(job.description);
};

export { processJobIntelligence, triggerJobIntelligenceProcessing, isJobProfileStale, hashDescription };
