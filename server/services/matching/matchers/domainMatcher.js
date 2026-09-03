// Compares CandidateProfile.domains against JobProfile.domains (both AI-inferred; Job
// itself has no domain field). No skill-style alias table is needed here - domain
// names are compared case-insensitively/trimmed only.
//
// Excluded (null score) whenever either side has no domain data at all - per the
// module's explicit "missing data is neutral, not a mismatch" rule; a domain mismatch
// must never be able to disqualify a candidate outright, and "no data" isn't a mismatch
// at all.
const domainKey = (domain) => String(domain).trim().toLowerCase();

const domainMatcher = (candidateProfile, job, jobProfile) => {
  const candidateDomains = candidateProfile?.domains || [];
  const jobDomains = jobProfile?.domains || [];

  if (candidateDomains.length === 0 || jobDomains.length === 0) {
    return { score: null, matched: [], candidateDomains, jobDomains };
  }

  const candidateKeys = new Set(candidateDomains.map(domainKey));
  const matched = jobDomains.filter((domain) => candidateKeys.has(domainKey(domain)));

  // Scored against the JOB's stated domains specifically ("does the candidate cover
  // what this job needs"), not a symmetric overlap measure - consistent with how
  // required/preferred skills are scored against the job's own list.
  return { score: matched.length / jobDomains.length, matched, candidateDomains, jobDomains };
};

export default domainMatcher;
