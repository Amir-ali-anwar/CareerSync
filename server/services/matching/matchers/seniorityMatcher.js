import { SENIORITY_LEVELS, inferSeniorityFromYearsOfExperience } from "../../../utils/normalization.js";

// Compares an inferred candidate seniority against JobProfile.seniority (AI-inferred
// from the job description - Job itself has no seniority field of its own).
//
// Candidate seniority is NOT read from a dedicated CandidateProfile field (none exists -
// resumes don't reliably self-report a level) - it's derived from
// CandidateProfile.yearsOfExperience via the same deterministic mapping used for jobs,
// so both sides land on the identical 4-level scale before comparison.
//
// Excluded (null score) whenever either side has no signal at all - a JobProfile that
// hasn't finished processing (or was never triggered) must not be treated as a
// mismatch; it's simply unknown, per the module's explicit "no incomplete profile
// should silently degrade to a bad score" rule.
const seniorityMatcher = (candidateProfile, job, jobProfile) => {
  const candidateSeniority = inferSeniorityFromYearsOfExperience(candidateProfile?.yearsOfExperience);
  const jobSeniority = jobProfile?.seniority || null;

  if (!candidateSeniority || !jobSeniority) {
    return { score: null, candidateSeniority, jobSeniority, distance: null };
  }

  const candidateIndex = SENIORITY_LEVELS.indexOf(candidateSeniority);
  const jobIndex = SENIORITY_LEVELS.indexOf(jobSeniority);
  const distance = Math.abs(candidateIndex - jobIndex);
  const maxDistance = SENIORITY_LEVELS.length - 1;

  return { score: 1 - distance / maxDistance, candidateSeniority, jobSeniority, distance };
};

export default seniorityMatcher;
