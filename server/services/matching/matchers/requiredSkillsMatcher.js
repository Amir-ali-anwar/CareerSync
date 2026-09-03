import { normalizeSkillList, normalizeSkillKey } from "../../../utils/normalization.js";

// Required skills are the single most decisive dimension (see algorithmVersions.js) -
// this compares CandidateProfile.skills against Job.requiredSkills (the employer's own
// authoritative field, NOT JobProfile - required skills are exactly what the employer
// declared, no AI inference needed or wanted here).
//
// Score is never null/excluded: an empty requiredSkills list is a real, definitive fact
// ("this job has no specific required skills"), so it resolves to a perfect score
// rather than "unknown" - there is nothing left unmet.
const requiredSkillsMatcher = (candidateProfile, job) => {
  const requiredSkills = normalizeSkillList(job?.requiredSkills || []);
  const candidateSkillKeys = new Set((candidateProfile?.skills || []).map(normalizeSkillKey));

  if (requiredSkills.length === 0) {
    return { score: 1, matched: [], missing: [] };
  }

  const matched = requiredSkills.filter((skill) => candidateSkillKeys.has(normalizeSkillKey(skill)));
  const missing = requiredSkills.filter((skill) => !candidateSkillKeys.has(normalizeSkillKey(skill)));

  return { score: matched.length / requiredSkills.length, matched, missing };
};

export default requiredSkillsMatcher;
