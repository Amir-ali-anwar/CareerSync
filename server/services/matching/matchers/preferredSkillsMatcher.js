import { normalizeSkillList, normalizeSkillKey } from "../../../utils/normalization.js";

// Same shape as requiredSkillsMatcher, against Job.preferredSkills instead - deliberately
// a separate, much lower-weighted dimension (see algorithmVersions.js) so preferred
// skills can only ever nudge the score, never compensate for a required-skills gap.
const preferredSkillsMatcher = (candidateProfile, job) => {
  const preferredSkills = normalizeSkillList(job?.preferredSkills || []);
  const candidateSkillKeys = new Set((candidateProfile?.skills || []).map(normalizeSkillKey));

  if (preferredSkills.length === 0) {
    return { score: 1, matched: [], missing: [] };
  }

  const matched = preferredSkills.filter((skill) => candidateSkillKeys.has(normalizeSkillKey(skill)));
  const missing = preferredSkills.filter((skill) => !candidateSkillKeys.has(normalizeSkillKey(skill)));

  return { score: matched.length / preferredSkills.length, matched, missing };
};

export default preferredSkillsMatcher;
