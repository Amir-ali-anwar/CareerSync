// Combines each dimension's 0..1 score into a single 0-100 matchScore using the given
// weight config (see algorithmVersions.js). A dimension whose score is null (excluded -
// "no data, don't judge it") is dropped entirely from BOTH the weighted sum and the
// total weight, so missing/unavailable data never drags the score down OR inflates it -
// the result is a fair average over only the evidence that actually exists.
//
// This renormalization is what makes "missing preference/seniority/domain data is
// neutral, not a penalty" actually true numerically, not just true in prose.
const aggregateScores = (dimensionResults, weights) => {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [dimension, weight] of Object.entries(weights)) {
    if (!weight) continue; // a 0-weight dimension (e.g. "semantic" in v1) never participates
    const result = dimensionResults[dimension];
    if (!result || result.score === null || result.score === undefined) continue;
    weightedSum += result.score * weight;
    totalWeight += weight;
  }

  // totalWeight is 0 only in a fully-degenerate case (every dimension excluded) - in
  // practice requiredSkills/preferredSkills never exclude (see their matchers), so this
  // is a defensive floor, not a path real profiles hit.
  const normalized = totalWeight > 0 ? weightedSum / totalWeight : 0;
  return Math.round(normalized * 100);
};

export { aggregateScores };
