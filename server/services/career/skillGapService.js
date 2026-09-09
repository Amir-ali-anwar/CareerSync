import { buildMissingSkills, formatList } from "../matching/explanationService.js";
import { classifyMatchLevel } from "../matching/matchLevel.js";
import { getAlgorithmWeights } from "../matching/algorithmVersions.js";

/**
 * Module H - Skill Gap Analysis & Career Improvement Engine.
 *
 * Sits directly on top of Module E's MatchResult (the same object
 * matchingService.calculateMatch/calculateMatchForCandidateAndJob/getMatchWithProfiles
 * already produces, and the same object Module G's explanationService.js reads) - no
 * second skill-comparison, normalization, or match-evidence system. `buildMissingSkills`
 * is imported directly from explanationService.js rather than reimplemented, and
 * `classifyMatchLevel` from Module G's matchLevel.js is reused for the match-level label.
 *
 * The ONE piece of evidence this module introduces that Module E/G do not compute at all
 * is a certification gap (CandidateProfile.certifications vs JobProfile.certifications) -
 * see buildCertificationGaps below for why that's still safe/deterministic to add.
 *
 * Pure and synchronous: no database access, no AI/network calls, no re-running matchers
 * or embeddings, no score simulation (see the module report's "Potential Match
 * Improvement" design note - deliberately not implemented).
 */

const SEVERITY = { CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low" };
const PRIORITY = { HIGH: "high", MEDIUM: "medium", LOW: "low" };
// Sort key only - never exposed. Primary axis is the exposed `priority` tier; within a
// tier, the matching algorithm's own dimension weight breaks ties (Step 13's "align with
// existing matching weights" requirement) - e.g. among "high" priority gaps, a missing
// required skill (weight .35 in v2) outranks a large seniority gap (weight .10).
const PRIORITY_RANK = { [PRIORITY.HIGH]: 2, [PRIORITY.MEDIUM]: 1, [PRIORITY.LOW]: 0 };

// Certifications are not a scored matching dimension anywhere in Module E - there is no
// "certification" entry in algorithmVersions.js's weight config, so a certification gap
// can never be described as "affecting the requiredSkills dimension" or similar. This is
// documented explicitly rather than invented as a fake weight.
const DIMENSION_KEY_BY_CATEGORY = {
  required_skill: "requiredSkills",
  preferred_skill: "preferredSkills",
  experience: "experience",
  seniority: "seniority",
  domain: "domain",
  certification: null,
};

/**
 * Required skills gap: every job-required skill the candidate's profile doesn't have.
 * Severity rule (documented, deliberately simple per spec): missing 3+ required skills
 * at once is "critical" (a broad, structural mismatch), missing 1-2 is "high" - both
 * always rank as "high" priority, since a required skill is the single most decisive
 * dimension in the matching engine itself (see algorithmVersions.js).
 */
const buildRequiredSkillGaps = (matchResult) => {
  const missing = buildMissingSkills(matchResult).filter((s) => s.type === "required");
  if (missing.length === 0) return [];
  const severity = missing.length >= 3 ? SEVERITY.CRITICAL : SEVERITY.HIGH;
  return missing.map((s) => ({
    category: "required_skill",
    item: s.skill,
    severity,
    priority: PRIORITY.HIGH,
    reason: "Required by this job.",
    affectedDimension: "requiredSkills",
    recommendedAction: { type: "skill_development", focus: s.skill },
  }));
};

// Preferred skills are always "medium" - they can only ever nudge a match, never block
// one (see preferredSkillsMatcher.js's own weighting rationale), so a missing preferred
// skill never rises to "high" no matter how many are missing.
const buildPreferredSkillGaps = (matchResult) => {
  const missing = buildMissingSkills(matchResult).filter((s) => s.type === "preferred");
  return missing.map((s) => ({
    category: "preferred_skill",
    item: s.skill,
    severity: SEVERITY.MEDIUM,
    priority: PRIORITY.MEDIUM,
    reason: "Preferred for this job.",
    affectedDimension: "preferredSkills",
    recommendedAction: { type: "skill_development", focus: s.skill },
  }));
};

/**
 * Experience gap: only for the two shortfall states experienceMatcher.js already
 * distinguishes - "significantly_below" (real gap, high severity/priority) vs
 * "slightly_below" (>= 80% of the requirement, a near-miss, medium). No gap is produced
 * for "meets"/"exceeds" (not a gap), "not_required" (nothing to satisfy), or "unknown"
 * (candidate data missing - generating a gap from an unknown value would be exactly the
 * "misleading analysis from incomplete data" the spec warns against).
 */
const buildExperienceGap = (matchResult) => {
  const { status, candidateYears, requiredYears } = matchResult.experienceComparison;
  if (status !== "slightly_below" && status !== "significantly_below") return null;

  const isSignificant = status === "significantly_below";
  return {
    category: "experience",
    item: `${requiredYears} year(s) of experience`,
    candidateValue: candidateYears,
    requiredValue: requiredYears,
    gap: requiredYears - candidateYears,
    severity: isSignificant ? SEVERITY.HIGH : SEVERITY.MEDIUM,
    priority: isSignificant ? PRIORITY.HIGH : PRIORITY.MEDIUM,
    reason: isSignificant
      ? "Below the experience level required for this role."
      : "Close to, but below, the experience level required for this role.",
    affectedDimension: "experience",
    recommendedAction: { type: "experience_development" },
  };
};

/**
 * Seniority gap: only for distance >= 1 (0 is an exact match, not a gap). distance === 1
 * (adjacent tier, e.g. mid vs senior) is "medium" - a near-miss; distance >= 2 is "high" -
 * a real gap. Deliberately factual, not prescriptive - per the spec's explicit warning,
 * this never claims a skill would fix a seniority gap (seniority here is inferred purely
 * from years of experience - see seniorityMatcher.js - so the only honest recommended
 * action is "experience_development", not a skill).
 */
const buildSeniorityGap = (matchResult) => {
  const { distance, candidateSeniority, jobSeniority } = matchResult.seniorityComparison;
  if (distance === null || distance === 0) return null;

  const isLargeGap = distance >= 2;
  return {
    category: "seniority",
    item: jobSeniority,
    candidateValue: candidateSeniority,
    requiredValue: jobSeniority,
    severity: isLargeGap ? SEVERITY.HIGH : SEVERITY.MEDIUM,
    priority: isLargeGap ? PRIORITY.HIGH : PRIORITY.MEDIUM,
    reason: `This role typically expects ${jobSeniority}-level experience; the candidate's profile currently indicates ${candidateSeniority}-level.`,
    affectedDimension: "seniority",
    recommendedAction: { type: "experience_development" },
  };
};

/**
 * Domain gap: one entry per job domain the candidate's profile doesn't cover. Excluded
 * entirely (not even attempted) when either side has no domain data at all - same "no
 * data is neutral, not a mismatch" rule domainMatcher.js itself already enforces, so this
 * never fabricates a domain relationship. A complete mismatch (candidate covers none of
 * the job's domains) is "medium"; a partial overlap (candidate covers some) is "low" -
 * the remaining gap is smaller and less decisive the more overlap already exists.
 */
const buildDomainGaps = (matchResult) => {
  const { matched, candidateDomains, jobDomains } = matchResult.domainOverlap;
  if (candidateDomains.length === 0 || jobDomains.length === 0) return [];

  const missingDomains = jobDomains.filter((domain) => !matched.includes(domain));
  if (missingDomains.length === 0) return [];

  const isPartialOverlap = matched.length > 0;
  const severity = isPartialOverlap ? SEVERITY.LOW : SEVERITY.MEDIUM;
  const priority = isPartialOverlap ? PRIORITY.LOW : PRIORITY.MEDIUM;

  return missingDomains.map((domain) => ({
    category: "domain",
    item: domain,
    candidateDomains,
    requiredDomains: jobDomains,
    severity,
    priority,
    reason: "Job requires relevant domain experience.",
    affectedDimension: "domain",
    recommendedAction: { type: "domain_experience_development", focus: domain },
  }));
};

// Deliberately NOT the skill alias table (SKILL_ALIASES in utils/normalization.js) -
// certifications aren't skills, and there is no existing certification-alias system to
// reuse; inventing skill-style aliases for certification names would be a new,
// undocumented equivalency system. This is intentionally just a case/whitespace-
// insensitive exact match, which is conservative and defensible without one.
const normalizeCertKey = (certification) => String(certification).trim().toLowerCase();

/**
 * Certification gap: the one gap category with no Module E matcher behind it at all
 * (JobProfile.certifications/CandidateProfile.certifications are never compared anywhere
 * in services/matching/). Still safe to add here because, unlike education (see the
 * module report's Limitations), both sides are flat string lists of specific named
 * certifications - a plain set-difference, structurally identical to a skill-gap
 * comparison, not a new fuzzy-equivalency system. Always "medium": JobProfile has no
 * required-vs-preferred split for certifications (only Job.requiredSkills/preferredSkills
 * has that distinction), so there's no reliable signal to rank a certification any higher
 * or lower than "medium".
 */
const buildCertificationGaps = (candidateCertifications = [], jobCertifications = []) => {
  if (jobCertifications.length === 0) return [];
  const candidateKeys = new Set(candidateCertifications.map(normalizeCertKey));
  return jobCertifications
    .filter((certification) => !candidateKeys.has(normalizeCertKey(certification)))
    .map((certification) => ({
      category: "certification",
      item: certification,
      severity: SEVERITY.MEDIUM,
      priority: PRIORITY.MEDIUM,
      reason: "Listed as a certification for this job.",
      affectedDimension: null,
      recommendedAction: { type: "certification_development", focus: certification },
    }));
};

const priorityScoreFor = (gap, weights) => {
  const dimensionKey = DIMENSION_KEY_BY_CATEGORY[gap.category];
  const weight = dimensionKey ? weights[dimensionKey] ?? 0 : 0;
  return PRIORITY_RANK[gap.priority] * 1000 + Math.round(weight * 100);
};

// Deterministic, template-based - no LLM call, mirrors buildSummary's own rule in
// explanationService.js (never a hardcoded technology name, always derived from the
// evidence just built).
const buildSummaryMessage = ({ totalGaps, highPriorityGaps, sortedGaps }) => {
  if (totalGaps === 0) {
    return "No significant gaps found for this role - your profile covers everything this analysis evaluated.";
  }
  if (highPriorityGaps > 0) {
    const topItems = sortedGaps.filter((gap) => gap.priority === PRIORITY.HIGH).slice(0, 3).map((gap) => gap.item);
    return `Focus on ${formatList(topItems)} first - ${highPriorityGaps === 1 ? "it's the highest-priority gap" : "these are the highest-priority gaps"} for this role.`;
  }
  return `You meet the high-priority requirements for this role; ${totalGaps} lower-priority gap${totalGaps === 1 ? "" : "s"} remain.`;
};

/**
 * Top-level composer. `matchResult` is the same object Module G's buildMatchExplanation
 * takes (calculateMatch's return shape, directly or via getMatchWithProfiles).
 * `certifications` is the one input Module H needs beyond what Module E/G already
 * compute - see buildCertificationGaps above.
 */
const buildSkillGapAnalysis = (matchResult, { candidateCertifications = [], jobCertifications = [] } = {}) => {
  const weights = getAlgorithmWeights(matchResult.matchingAlgorithmVersion);
  const matchLevel = classifyMatchLevel(matchResult.matchScore);

  const experienceGap = buildExperienceGap(matchResult);
  const seniorityGap = buildSeniorityGap(matchResult);

  const gaps = [
    ...buildRequiredSkillGaps(matchResult),
    ...buildPreferredSkillGaps(matchResult),
    ...(experienceGap ? [experienceGap] : []),
    ...(seniorityGap ? [seniorityGap] : []),
    ...buildDomainGaps(matchResult),
    ...buildCertificationGaps(candidateCertifications, jobCertifications),
  ];

  // Array.prototype.sort is a stable sort (guaranteed since ES2019) - gaps built in the
  // fixed order above (and, within each builder, in the job's own skill/domain list
  // order) keep that relative order whenever their priorityScore ties, which is what
  // makes this ordering reproducible rather than incidental.
  const sortedGaps = [...gaps].sort((a, b) => priorityScoreFor(b, weights) - priorityScoreFor(a, weights));

  const prioritizedRoadmap = sortedGaps.map((gap, index) => ({
    rank: index + 1,
    category: gap.category,
    item: gap.item,
    priority: gap.priority,
    // Intentionally mirrors `priority` (both derived from the same dimension-weight +
    // severity evidence) rather than a simulated "score if fixed" delta - see the module
    // report's "Potential Match Improvement" design note for why that was deliberately
    // not implemented.
    impact: gap.priority,
  }));

  const totalGaps = sortedGaps.length;
  const highPriorityGaps = sortedGaps.filter((gap) => gap.priority === PRIORITY.HIGH).length;
  const criticalGaps = sortedGaps.filter((gap) => gap.severity === SEVERITY.CRITICAL).length;

  return {
    matchScore: matchResult.matchScore,
    matchLevel,
    matchingAlgorithmVersion: matchResult.matchingAlgorithmVersion,
    candidateProfileVersion: matchResult.candidateProfileVersion,
    jobProfileVersion: matchResult.jobProfileVersion,
    candidateProfileStatus: matchResult.candidateProfileStatus,
    jobProfileStatus: matchResult.jobProfileStatus,
    summary: {
      totalGaps,
      criticalGaps,
      highPriorityGaps,
      message: buildSummaryMessage({ totalGaps, highPriorityGaps, sortedGaps }),
    },
    gaps: sortedGaps,
    prioritizedRoadmap,
  };
};

export {
  buildSkillGapAnalysis,
  buildRequiredSkillGaps,
  buildPreferredSkillGaps,
  buildExperienceGap,
  buildSeniorityGap,
  buildDomainGaps,
  buildCertificationGaps,
};
