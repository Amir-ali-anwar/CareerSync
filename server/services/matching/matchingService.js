import requiredSkillsMatcher from "./matchers/requiredSkillsMatcher.js";
import preferredSkillsMatcher from "./matchers/preferredSkillsMatcher.js";
import experienceMatcher from "./matchers/experienceMatcher.js";
import seniorityMatcher from "./matchers/seniorityMatcher.js";
import domainMatcher from "./matchers/domainMatcher.js";
import preferenceMatcher from "./matchers/preferenceMatcher.js";
import semanticMatcher from "./matchers/semanticMatcher.js";
import { aggregateScores } from "./scoreAggregator.js";
import { MATCHING_ALGORITHM_VERSION, getAlgorithmWeights } from "./algorithmVersions.js";
import CandidateProfileModel from "../../models/CandidateProfileModel.js";
import JobProfileModel from "../../models/JobProfileModel.js";
import JobModel from "../../models/JobsModel.js";
import { vectorStore } from "../embeddings/embeddingService.js";
import { classifyMatchLevel } from "./matchLevel.js";

/**
 * Pure, deterministic core: candidateProfile + job (+ optional jobProfile) -> a
 * structured MatchResult. No database access, no AI/network calls - the same three
 * inputs always produce the same output (see algorithmVersions.js for the versioned
 * weight config that's the other half of that determinism guarantee). This is what
 * every matcher-level and ranking test in tests/matching/ exercises directly.
 *
 * `candidateProfile` and `jobProfile` may be null (profile not yet created/processed) -
 * every matcher already handles that gracefully (see each matcher's own null-handling),
 * degrading to excluding just the dimensions that depend on the missing data rather
 * than refusing to compute a score at all.
 */
const calculateMatch = (candidateProfile, job, jobProfile, { algorithmVersion = MATCHING_ALGORITHM_VERSION } = {}) => {
  const weights = getAlgorithmWeights(algorithmVersion);

  const requiredSkills = requiredSkillsMatcher(candidateProfile, job);
  const preferredSkills = preferredSkillsMatcher(candidateProfile, job);
  const experience = experienceMatcher(candidateProfile, job);
  const seniority = seniorityMatcher(candidateProfile, job, jobProfile);
  const domain = domainMatcher(candidateProfile, job, jobProfile);
  const preferences = preferenceMatcher(candidateProfile, job);
  const semantic = semanticMatcher(candidateProfile, jobProfile);

  const matchScore = aggregateScores(
    { requiredSkills, preferredSkills, experience, seniority, domain, preferences, semantic },
    weights
  );

  return {
    matchScore,
    componentScores: {
      requiredSkills: requiredSkills.score,
      preferredSkills: preferredSkills.score,
      experience: experience.score,
      seniority: seniority.score,
      domain: domain.score,
      preferences: preferences.score,
      semantic: semantic.score,
    },
    matchedSkills: requiredSkills.matched,
    missingRequiredSkills: requiredSkills.missing,
    matchedPreferredSkills: preferredSkills.matched,
    missingPreferredSkills: preferredSkills.missing,
    experienceComparison: {
      candidateYears: experience.candidateYears,
      requiredYears: experience.requiredYears,
      status: experience.status,
    },
    seniorityComparison: {
      candidateSeniority: seniority.candidateSeniority,
      jobSeniority: seniority.jobSeniority,
      distance: seniority.distance,
    },
    domainOverlap: {
      matched: domain.matched,
      candidateDomains: domain.candidateDomains,
      jobDomains: domain.jobDomains,
    },
    preferenceCompatibility: {
      workMode: preferences.workMode,
      location: preferences.location,
    },
    matchingAlgorithmVersion: algorithmVersion,
  };
};

// "not_found" covers a profile document that doesn't exist at all; everything else is
// that document's own AI_PROCESSING_STATUS value (pending/processing/completed/failed) -
// no separate "available" label is invented, "completed" already means usable.
const deriveProfileStatus = (profileDoc) => (profileDoc ? profileDoc.processingStatus : "not_found");

/**
 * DB-aware core, fetches once and returns both the computed match AND the raw profile
 * documents - added for Module H (skillGapService.js), which needs fields
 * (CandidateProfile.certifications/JobProfile.certifications) that MatchResult itself
 * doesn't carry, without re-querying what this function already fetched. Returns null
 * only when the job itself doesn't exist (the caller should 404) - a missing/incomplete
 * CandidateProfile or JobProfile is NOT an error condition here, it's reflected via
 * candidateProfileStatus/jobProfileStatus alongside a score computed from whatever
 * evidence IS available (see calculateMatch's per-matcher null-handling).
 */
const getMatchWithProfiles = async (userId, jobId, options) => {
  const [job, candidateProfile, jobProfile] = await Promise.all([
    JobModel.findById(jobId),
    CandidateProfileModel.findOne({ user: userId }).select("+embedding"),
    JobProfileModel.findOne({ job: jobId }).select("+embedding"),
  ]);

  if (!job) return null;

  const result = calculateMatch(candidateProfile, job, jobProfile, options);
  const match = {
    ...result,
    candidateProfileVersion: candidateProfile?.profileVersion ?? null,
    jobProfileVersion: jobProfile?.profileVersion ?? null,
    candidateProfileStatus: deriveProfileStatus(candidateProfile),
    jobProfileStatus: deriveProfileStatus(jobProfile),
  };

  return { match, job, candidateProfile, jobProfile };
};

/**
 * DB-aware wrapper around calculateMatch, used by controllers that only need the score
 * (not the raw profile documents) - see getMatchWithProfiles above for the shared fetch
 * this builds on.
 */
const calculateMatchForCandidateAndJob = async (userId, jobId, options) => {
  const result = await getMatchWithProfiles(userId, jobId, options);
  return result ? result.match : null;
};

/**
 * Bulk variant for annotating a list of applications with match scores (see
 * controllers/jobApplicationController.js#getJobApplications) - fetches every
 * candidate's CandidateProfile in ONE query (no N+1), reuses a single JobProfile fetch
 * for the (single) job all these applications belong to.
 */
const calculateMatchesForCandidates = async (userIds, job, jobProfile, options) => {
  const profiles = await CandidateProfileModel.find({ user: { $in: userIds } }).select("+embedding");
  const profileByUserId = new Map(profiles.map((profile) => [String(profile.user), profile]));

  return userIds.reduce((byUserId, userId) => {
    const candidateProfile = profileByUserId.get(String(userId)) || null;
    const result = calculateMatch(candidateProfile, job, jobProfile, options);
    byUserId[String(userId)] = {
      ...result,
      candidateProfileVersion: candidateProfile?.profileVersion ?? null,
      jobProfileVersion: jobProfile?.profileVersion ?? null,
      candidateProfileStatus: deriveProfileStatus(candidateProfile),
      jobProfileStatus: deriveProfileStatus(jobProfile),
    };
    return byUserId;
  }, {});
};

// Bounds how many open jobs a single /candidate-profile/matches call will score against -
// same reasoning as talentController's MAX_EXPORT_RECORDS: an unbounded scan+score over
// every open job in the system is the one truly unbounded-by-time query this endpoint
// could otherwise run.
const MAX_MATCHING_CANDIDATE_JOBS = 500;
const RECOMMENDATION_RETRIEVAL_LIMIT = 50;

const isOpenJob = (job) =>
  job &&
  !job.isClosed &&
  (!job.applicationDeadline || new Date(job.applicationDeadline).getTime() > Date.now());

const rankRecommendation = (left, right) =>
  right.matchScore - left.matchScore ||
  (right.componentScores.semantic ?? -1) - (left.componentScores.semantic ?? -1) ||
  (right.componentScores.requiredSkills ?? 0) - (left.componentScores.requiredSkills ?? 0) ||
  String(left.job._id).localeCompare(String(right.job._id));

const buildRecommendationItem = (job, candidateProfile, jobProfile) => {
  const result = calculateMatch(candidateProfile, job, jobProfile);
  return {
    job,
    matchScore: result.matchScore,
    classification: classifyMatchLevel(result.matchScore),
    componentScores: result.componentScores,
    matchedSkills: result.matchedSkills,
    missingRequiredSkills: result.missingRequiredSkills,
    matchingAlgorithmVersion: result.matchingAlgorithmVersion,
    jobProfileStatus: deriveProfileStatus(jobProfile),
  };
};

/**
 * Batched counterpart to calculateMatchForCandidateAndJob - ranks every open,
 * non-expired job against ONE candidate's profile, for GET /candidate-profile/matches.
 * Scoring happens in memory over at most MAX_MATCHING_CANDIDATE_JOBS jobs (fetched once,
 * along with their JobProfiles in a single follow-up query - no N+1), then the caller's
 * page is sliced off the sorted, optionally minScore-filtered result.
 */
const calculateMatchesForCandidate = async (userId, { page = 1, limit = 10, minScore = 0 } = {}) => {
  const candidateProfile = await CandidateProfileModel.findOne({ user: userId }).select("+embedding");
  const candidateProfileStatus = deriveProfileStatus(candidateProfile);

  const openJobsFilter = {
    isClosed: false,
    $or: [{ applicationDeadline: null }, { applicationDeadline: { $gt: new Date() } }],
  };
  let jobs;
  let usedSemanticRetrieval = false;

  if (candidateProfile?.embedding?.length) {
    const retrieved = await vectorStore.search({
      sourceType: "job",
      vector: candidateProfile.embedding,
      limit: RECOMMENDATION_RETRIEVAL_LIMIT,
      filter: { processingStatus: "completed" },
    });
    const retrievedIds = retrieved.map((item) => item.sourceId);
    if (retrievedIds.length > 0) {
      const retrievedJobs = await JobModel.find({ ...openJobsFilter, _id: { $in: retrievedIds } });
      const byId = new Map(retrievedJobs.map((job) => [String(job._id), job]));
      jobs = retrievedIds.map((id) => byId.get(String(id))).filter(isOpenJob);
      usedSemanticRetrieval = jobs.length > 0;
    }
  }

  if (!jobs || jobs.length === 0) {
    jobs = await JobModel.find(openJobsFilter).sort("-createdAt").limit(MAX_MATCHING_CANDIDATE_JOBS);
    usedSemanticRetrieval = false;
  }
  const jobIds = jobs.map((job) => job._id);
  const jobProfiles = await JobProfileModel.find({ job: { $in: jobIds } }).select("+embedding");
  const jobProfileByJobId = new Map(jobProfiles.map((profile) => [String(profile.job), profile]));

  const scored = jobs
    .map((job) => {
      const jobProfile = jobProfileByJobId.get(String(job._id)) || null;
      return buildRecommendationItem(job, candidateProfile, jobProfile);
    })
    .filter((match) => match.matchScore >= minScore)
    .sort(rankRecommendation);

  const total = scored.length;
  const numOfPages = Math.max(Math.ceil(total / limit), 1);
  const start = (page - 1) * limit;
  const items = scored.slice(start, start + limit);

  return { items, total, numOfPages, currentPage: page, candidateProfileStatus, usedSemanticRetrieval };
};

export {
  calculateMatch,
  calculateMatchForCandidateAndJob,
  calculateMatchesForCandidates,
  calculateMatchesForCandidate,
  getMatchWithProfiles,
};
