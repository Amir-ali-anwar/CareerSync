// Compares CandidateProfile.yearsOfExperience against Job.requiredExperience (the
// employer's own authoritative field).
//
// score is a continuous 0..1 value (not a bucketed constant) so the aggregate reflects
// the actual size of a shortfall rather than a handful of arbitrary category jumps -
// but `status` still gives a human-readable category derived from the same ratio, for
// explainability (Module G will read this, not recompute it).
//
// Handles missing data per the module's explicit rule: a job with no stated experience
// requirement is trivially satisfied (score 1, status "not_required") - that's a real
// fact about the job, not missing data. A candidate with NO recorded experience against
// a job that DOES require some is genuinely unknown (excluded/null score) - never
// silently treated as "0 years" (an unmet candidate profile is not the same claim as
// "this candidate has zero experience").
const experienceMatcher = (candidateProfile, job) => {
  const requiredYears = job?.requiredExperience;
  const candidateYears = candidateProfile?.yearsOfExperience;

  if (requiredYears === undefined || requiredYears === null) {
    return { score: 1, status: "not_required", candidateYears: candidateYears ?? null, requiredYears: null };
  }

  if (candidateYears === undefined || candidateYears === null) {
    return { score: null, status: "unknown", candidateYears: null, requiredYears };
  }

  if (candidateYears >= requiredYears) {
    const status = requiredYears === 0 || candidateYears === requiredYears ? "meets" : "exceeds";
    return { score: 1, status, candidateYears, requiredYears };
  }

  const ratio = requiredYears > 0 ? candidateYears / requiredYears : 1;
  const status = ratio >= 0.8 ? "slightly_below" : "significantly_below";
  return { score: ratio, status, candidateYears, requiredYears };
};

export default experienceMatcher;
