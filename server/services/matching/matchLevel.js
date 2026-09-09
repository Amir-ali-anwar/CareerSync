// Single source of truth for classifying a 0-100 matchScore into a human-facing level.
// Module E (matchingService.js/scoreAggregator.js) only ever produces the numeric score -
// no classification existed anywhere in the codebase before this, so these thresholds are
// introduced here for Module G and must not be duplicated elsewhere.
//
// Boundaries are inclusive on the lower bound of each tier (e.g. exactly 90 is
// "excellent_match", exactly 89 is "strong_match") - see tests/matching/matchLevel.test.js
// for explicit boundary assertions at every tier edge.
const MATCH_LEVELS = [
  { level: "excellent_match", label: "Excellent Match", minScore: 90, maxScore: 100 },
  { level: "strong_match", label: "Strong Match", minScore: 75, maxScore: 89 },
  { level: "moderate_match", label: "Moderate Match", minScore: 60, maxScore: 74 },
  { level: "weak_match", label: "Weak Match", minScore: 40, maxScore: 59 },
  { level: "poor_match", label: "Poor Match", minScore: 0, maxScore: 39 },
];

const classifyMatchLevel = (matchScore) => {
  const tier = MATCH_LEVELS.find((candidate) => matchScore >= candidate.minScore);
  // Only unreachable for a negative score, which calculateMatch/aggregateScores never
  // produces (Math.round of a 0..1-bounded weighted average) - a defensive floor, not a
  // path real scores hit.
  return tier ?? MATCH_LEVELS[MATCH_LEVELS.length - 1];
};

export { MATCH_LEVELS, classifyMatchLevel };
