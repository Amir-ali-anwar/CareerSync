import { getAlgorithmWeights } from "./algorithmVersions.js";
import { classifyMatchLevel } from "./matchLevel.js";

/**
 * Module G - Explainable "Why You Match".
 *
 * This is a pure, synchronous transform: MatchResult (already computed by Module E's
 * matchingService.js - calculateMatch/calculateMatchForCandidateAndJob/
 * calculateMatchesForCandidates) in, a structured Explanation out. No database access,
 * no AI/network calls, no re-running matchers or embeddings - every field below is
 * derived from evidence the matching engine already produced. This module never
 * calculates or adjusts a score; it only explains one that already exists.
 *
 * Deliberately does not receive candidateProfile/job/jobProfile documents directly - only
 * the already-computed MatchResult - so it structurally cannot reach into resumeText,
 * embedding vectors, or any other private field that MatchResult never carries in the
 * first place (see matchingService.js's calculateMatch return shape).
 */

const DIMENSION_LABELS = {
  requiredSkills: "Required Skills",
  preferredSkills: "Preferred Skills",
  experience: "Experience",
  seniority: "Seniority",
  domain: "Domain",
  preferences: "Preferences",
  semantic: "Semantic Similarity",
};

// Fixed display order, independent of object key insertion order.
const DIMENSION_ORDER = ["requiredSkills", "preferredSkills", "experience", "seniority", "domain", "preferences", "semantic"];

const pct = (fraction) => (fraction === null || fraction === undefined ? null : Math.round(fraction * 100));

/**
 * One row per dimension in the algorithm version's weight config - a dimension the
 * matcher excluded (null score) is still listed (transparency: "this dimension didn't
 * count either way"), just marked included:false and excluded from `weight`'s effect on
 * the overall score, mirroring scoreAggregator.js's own renormalization rule exactly.
 */
const buildScoreBreakdown = (componentScores, weights) =>
  DIMENSION_ORDER.filter((dimension) => dimension in weights).map((dimension) => {
    const weight = weights[dimension];
    const rawScore = componentScores[dimension];
    const included = Boolean(weight) && rawScore !== null && rawScore !== undefined;
    return {
      dimension,
      label: DIMENSION_LABELS[dimension],
      score: pct(rawScore),
      weight: Math.round(weight * 100),
      included,
    };
  });

// Required -> high, preferred -> medium. Documented, deliberately simple rule (Module G
// spec explicitly permits this instead of a more elaborate importance model).
const IMPORTANCE_BY_TYPE = { required: "high", preferred: "medium" };

const buildMatchedSkills = (matchResult) => [
  ...matchResult.matchedSkills.map((skill) => ({ skill, type: "required" })),
  ...matchResult.matchedPreferredSkills.map((skill) => ({ skill, type: "preferred" })),
];

const buildMissingSkills = (matchResult) => [
  ...matchResult.missingRequiredSkills.map((skill) => ({ skill, type: "required", importance: IMPORTANCE_BY_TYPE.required })),
  ...matchResult.missingPreferredSkills.map((skill) => ({ skill, type: "preferred", importance: IMPORTANCE_BY_TYPE.preferred })),
];

/**
 * Only emits a partial-match entry where the underlying matcher evidence already
 * represents a genuine "close but not exact" state - never a fuzzy interpretation
 * invented on top of a binary match/no-match result (Module G spec's explicit rule).
 */
const buildPartialMatches = (matchResult) => {
  const partials = [];
  const { experienceComparison, seniorityComparison, domainOverlap, preferenceCompatibility } = matchResult;

  // Only "slightly_below" (>= 80% of the requirement, per experienceMatcher.js) is a
  // genuine near-miss - "significantly_below" is a real gap, surfaced as an improvement
  // instead (see buildImprovements), not dressed up as "close."
  if (experienceComparison.status === "slightly_below") {
    partials.push({
      category: "experience",
      candidateValue: experienceComparison.candidateYears,
      requiredValue: experienceComparison.requiredYears,
      message: `Candidate has ${experienceComparison.candidateYears} year(s) of experience, close to the ${experienceComparison.requiredYears} year(s) required.`,
    });
  }

  // distance === 1 means adjacent levels on the 4-tier ladder (e.g. mid vs senior) -
  // genuinely "close but not exact"; distance >= 2 is a real gap, surfaced as an
  // improvement instead (see buildImprovements).
  if (seniorityComparison.distance === 1) {
    partials.push({
      category: "seniority",
      candidateValue: seniorityComparison.candidateSeniority,
      requiredValue: seniorityComparison.jobSeniority,
      message: `Candidate's inferred seniority (${seniorityComparison.candidateSeniority}) is close to this role's ${seniorityComparison.jobSeniority} level, but not an exact match.`,
    });
  }

  if (domainOverlap.matched.length > 0 && domainOverlap.matched.length < domainOverlap.jobDomains.length) {
    const missingDomains = domainOverlap.jobDomains.filter((domain) => !domainOverlap.matched.includes(domain));
    partials.push({
      category: "domain",
      candidateValue: domainOverlap.matched,
      requiredValue: domainOverlap.jobDomains,
      message: `Candidate's domain experience overlaps with some but not all of this job's domains (missing: ${missingDomains.join(", ")}).`,
    });
  }

  const { workMode, location } = preferenceCompatibility;
  if (workMode.score !== null && location.score !== null && workMode.score !== location.score) {
    const matchedAspect = workMode.score === 1 ? "work mode" : "location";
    const mismatchedAspect = workMode.score === 1 ? "location" : "work mode";
    partials.push({
      category: "preferences",
      candidateValue: null,
      requiredValue: null,
      message: `Candidate's ${matchedAspect} preference matches, but ${mismatchedAspect} preference does not.`,
    });
  }

  return partials;
};

const buildStrengths = (matchResult, weights) => {
  const strengths = [];
  const { componentScores, experienceComparison, seniorityComparison, domainOverlap, preferenceCompatibility } = matchResult;

  if (componentScores.requiredSkills === 1) {
    strengths.push({ category: "skills", message: "Matches all required technical skills." });
  } else if (componentScores.requiredSkills >= 0.8) {
    strengths.push({ category: "skills", message: "Matches most required technical skills." });
  }

  if (matchResult.matchedPreferredSkills.length > 0 && componentScores.preferredSkills === 1) {
    strengths.push({ category: "skills", message: "Also matches every preferred (nice-to-have) skill." });
  }

  if (experienceComparison.status === "meets" || experienceComparison.status === "exceeds") {
    strengths.push({ category: "experience", message: "Meets or exceeds the required experience for this role." });
  }

  if (seniorityComparison.distance === 0) {
    strengths.push({ category: "seniority", message: "Seniority level aligns with the role." });
  }

  if (domainOverlap.matched.length > 0 && domainOverlap.jobDomains.length > 0 && domainOverlap.matched.length === domainOverlap.jobDomains.length) {
    strengths.push({ category: "domain", message: "Strong domain experience overlap with this role." });
  }

  const { workMode, location } = preferenceCompatibility;
  if ((workMode.score === 1 || workMode.score === null) && (location.score === 1 || location.score === null) && (workMode.score === 1 || location.score === 1)) {
    strengths.push({ category: "preferences", message: "Location and work-mode preferences align with this role." });
  }

  // Never fabricate a semantic-similarity strength when this algorithm version doesn't
  // weight it (v1) - a 0 weight means the dimension never contributed, so praising it
  // would misrepresent what actually drove the score.
  if (weights.semantic > 0 && componentScores.semantic !== null && componentScores.semantic >= 0.8) {
    strengths.push({ category: "overall_fit", message: "Overall profile closely matches the job description." });
  }

  return strengths;
};

// Keeps the list tight and focused on "what affected this particular match" rather than
// becoming a full skill-gap analysis (explicitly out of scope - see Module H).
const MAX_IMPROVEMENTS = 8;

const buildImprovements = (matchResult, weights) => {
  const improvements = [];
  const { experienceComparison, seniorityComparison, domainOverlap, preferenceCompatibility } = matchResult;

  matchResult.missingRequiredSkills.forEach((skill) => {
    improvements.push({ category: "skill", item: skill, reason: "Required by this job." });
  });
  matchResult.missingPreferredSkills.forEach((skill) => {
    improvements.push({ category: "skill", item: skill, reason: "Preferred for this job." });
  });

  if (experienceComparison.status === "significantly_below") {
    improvements.push({
      category: "experience",
      item: `${experienceComparison.requiredYears} year(s) of experience`,
      reason: "Below the experience level required for this role.",
    });
  }

  if (seniorityComparison.distance !== null && seniorityComparison.distance >= 2) {
    improvements.push({
      category: "seniority",
      item: seniorityComparison.jobSeniority,
      reason: `This role typically expects ${seniorityComparison.jobSeniority}-level experience.`,
    });
  }

  if (domainOverlap.jobDomains.length > 0) {
    domainOverlap.jobDomains
      .filter((domain) => !domainOverlap.matched.includes(domain))
      .forEach((domain) => {
        improvements.push({ category: "domain", item: domain, reason: "Job requires relevant domain experience." });
      });
  }

  if (preferenceCompatibility.workMode.score === 0) {
    improvements.push({
      category: "preferences",
      item: "work mode",
      reason: `This role is ${preferenceCompatibility.workMode.jobWorkMode}, which differs from the candidate's stated preference.`,
    });
  }
  if (preferenceCompatibility.location.score === 0) {
    improvements.push({ category: "preferences", item: "location", reason: "Job location differs from the candidate's stated preferences." });
  }

  // Never surface a semantic "gap" for an algorithm version that doesn't weight it.
  if (weights.semantic > 0 && matchResult.componentScores.semantic !== null && matchResult.componentScores.semantic < 0.4) {
    improvements.push({ category: "overall_fit", item: "profile alignment", reason: "Overall profile has low semantic similarity to this job description." });
  }

  return improvements.slice(0, MAX_IMPROVEMENTS);
};

const formatList = (items) => {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

// Deterministic - built entirely from the structured evidence above, never an LLM call
// and never a hardcoded technology name (Module G's explicit "must not invent evidence"
// rule).
const buildSummary = ({ matchLevel, matchedSkills, missingSkills }) => {
  const sentences = [`${matchLevel.label}.`];

  const requiredMatched = matchedSkills.filter((s) => s.type === "required").map((s) => s.skill);
  const requiredMissing = missingSkills.filter((s) => s.type === "required").map((s) => s.skill);

  if (requiredMatched.length > 0) {
    sentences.push(`Your strongest matches are ${formatList(requiredMatched.slice(0, 3))}.`);
  }

  if (requiredMissing.length > 0) {
    sentences.push(`The main gaps for this position are ${formatList(requiredMissing.slice(0, 3))}.`);
  } else {
    sentences.push("You meet all of this job's required skills.");
  }

  return sentences.join(" ");
};

/**
 * Top-level composer - the only export most callers need. `matchResult` is exactly the
 * object shape returned by calculateMatch (directly, or via
 * calculateMatchForCandidateAndJob/calculateMatchesForCandidates), so this works
 * identically for the talent's own match and an employer's applicant-facing match.
 */
const buildMatchExplanation = (matchResult) => {
  const weights = getAlgorithmWeights(matchResult.matchingAlgorithmVersion);
  const matchLevel = classifyMatchLevel(matchResult.matchScore);

  const matchedSkills = buildMatchedSkills(matchResult);
  const missingSkills = buildMissingSkills(matchResult);

  return {
    matchScore: matchResult.matchScore,
    matchLevel,
    matchingAlgorithmVersion: matchResult.matchingAlgorithmVersion,
    candidateProfileStatus: matchResult.candidateProfileStatus,
    jobProfileStatus: matchResult.jobProfileStatus,
    scoreBreakdown: buildScoreBreakdown(matchResult.componentScores, weights),
    matchedSkills,
    missingSkills,
    partialMatches: buildPartialMatches(matchResult),
    strengths: buildStrengths(matchResult, weights),
    improvements: buildImprovements(matchResult, weights),
    summary: buildSummary({ matchLevel, matchedSkills, missingSkills }),
  };
};

export { buildMatchExplanation, buildScoreBreakdown, buildMatchedSkills, buildMissingSkills, buildPartialMatches, buildStrengths, buildImprovements, buildSummary, formatList };
