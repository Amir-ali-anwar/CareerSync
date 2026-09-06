// Compares candidate preferences (CandidateProfile.workModePreference,
// .preferredLocations) against the job's own authoritative fields (Job.workMode,
// Job.jobLocation) - never JobProfile, which deliberately doesn't duplicate these.
//
// Two independent sub-checks (work mode, location) are averaged when both have
// something to say; either sub-check is individually excluded when there's no
// preference/requirement to compare, and the whole dimension is excluded only if BOTH
// sub-checks are. A candidate who simply hasn't stated a preference is never penalized -
// "any"/unset reads as full compatibility, not a mismatch, per the module's explicit rule.

const scoreWorkMode = (candidatePreference, jobWorkMode) => {
  // "any" is workModePreference's schema default (never truly unset) and a job that
  // didn't specify a mode both mean "no constraint stated" - excluded (null), not
  // scored as a match, per the module's "missing preference = neutral, not evaluated"
  // rule rather than treated as an automatic full-credit compatibility claim.
  if (!candidatePreference || candidatePreference === "any" || !jobWorkMode) return null;
  return candidatePreference === jobWorkMode ? 1 : 0;
};

const scoreLocation = (preferredLocations, jobLocation) => {
  if (!preferredLocations || preferredLocations.length === 0) return null; // no stated preference
  if (!jobLocation || (!jobLocation.city && !jobLocation.country)) return null; // nothing to compare against

  const haystack = `${jobLocation.city || ""} ${jobLocation.country || ""}`.toLowerCase();
  const isRemoteFriendly = preferredLocations.some((loc) => /remote/i.test(loc));
  const matchesNamedLocation = preferredLocations.some((loc) => {
    const needle = loc.trim().toLowerCase();
    return needle && haystack.includes(needle);
  });

  return isRemoteFriendly || matchesNamedLocation ? 1 : 0;
};

const preferenceMatcher = (candidateProfile, job) => {
  const workModeScore = scoreWorkMode(candidateProfile?.workModePreference, job?.workMode);
  const locationScore = scoreLocation(candidateProfile?.preferredLocations, job?.jobLocation);

  const subScores = [workModeScore, locationScore].filter((score) => score !== null);
  const score = subScores.length ? subScores.reduce((sum, s) => sum + s, 0) / subScores.length : null;

  return {
    score,
    workMode: { candidatePreference: candidateProfile?.workModePreference ?? null, jobWorkMode: job?.workMode ?? null, score: workModeScore },
    location: { preferredLocations: candidateProfile?.preferredLocations || [], jobLocation: job?.jobLocation ?? null, score: locationScore },
  };
};

export default preferenceMatcher;
