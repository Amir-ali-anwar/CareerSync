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
 * DB-aware wrapper around calculateMatch, used by controllers. Returns null only when
 * the job itself doesn't exist (the caller should 404) - a missing/incomplete
 * CandidateProfile or JobProfile is NOT an error condition here, it's reflected via
 * candidateProfileStatus/jobProfileStatus alongside a score computed from whatever
 * evidence IS available (see calculateMatch's per-matcher null-handling).
 */
const calculateMatchForCandidateAndJob = async (userId, jobId, options) => {
  const [job, candidateProfile, jobProfile] = await Promise.all([
    JobModel.findById(jobId),
    CandidateProfileModel.findOne({ user: userId }).select("+embedding"),
    JobProfileModel.findOne({ job: jobId }).select("+embedding"),
  ]);

  if (!job) return null;

  const result = calculateMatch(candidateProfile, job, jobProfile, options);
  return {
    ...result,
    candidateProfileVersion: candidateProfile?.profileVersion ?? null,
    jobProfileVersion: jobProfile?.profileVersion ?? null,
    candidateProfileStatus: deriveProfileStatus(candidateProfile),
    jobProfileStatus: deriveProfileStatus(jobProfile),
  };
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
  const jobs = await JobModel.find(openJobsFilter).sort("-createdAt").limit(MAX_MATCHING_CANDIDATE_JOBS);
  const jobIds = jobs.map((job) => job._id);
  const jobProfiles = await JobProfileModel.find({ job: { $in: jobIds } }).select("+embedding");
  const jobProfileByJobId = new Map(jobProfiles.map((profile) => [String(profile.job), profile]));

  const scored = jobs
    .map((job) => {
      const jobProfile = jobProfileByJobId.get(String(job._id)) || null;
      const result = calculateMatch(candidateProfile, job, jobProfile);
      return {
        job,
        matchScore: result.matchScore,
        componentScores: result.componentScores,
        matchedSkills: result.matchedSkills,
        missingRequiredSkills: result.missingRequiredSkills,
        matchingAlgorithmVersion: result.matchingAlgorithmVersion,
        jobProfileStatus: deriveProfileStatus(jobProfile),
      };
    })
    .filter((match) => match.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore);

  const total = scored.length;
  const numOfPages = Math.max(Math.ceil(total / limit), 1);
  const start = (page - 1) * limit;
  const items = scored.slice(start, start + limit);

  return { items, total, numOfPages, currentPage: page, candidateProfileStatus };
};

export {
  calculateMatch,
  calculateMatchForCandidateAndJob,
  calculateMatchesForCandidates,
  calculateMatchesForCandidate,
};
