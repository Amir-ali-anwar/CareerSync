// Single source of truth for matching-algorithm versions and their dimension weights.
// Never hardcode a version string or a weight anywhere else - scoreAggregator.js and
// matchingService.js both read from here, so introducing "v2" later means adding an
// entry to this registry, not touching matcher logic or the aggregation formula.

// Required skills get by far the strongest influence (see AUDIT rationale below);
// everything else is a softer signal that shouldn't be able to compensate for a
// candidate missing most of what the job actually requires.
const MATCHING_ALGORITHM_V1 = {
  requiredSkills: 0.4,
  preferredSkills: 0.1,
  experience: 0.15,
  seniority: 0.1,
  domain: 0.1,
  preferences: 0.15,
  // Reserved, not part of the 100% split for v1 - services/matching/matchers/
  // semanticMatcher.js is a stub that always returns a null score, so a 0 weight here
  // means it never contributes (and never needs "renormalizing away") until Module F
  // gives it real weight in a later version. This is what lets Module F plug in
  // without rewriting the aggregator or this file's structure.
  semantic: 0,
};

const MATCHING_ALGORITHM_V2 = {
  requiredSkills: 0.35,
  preferredSkills: 0.1,
  experience: 0.15,
  seniority: 0.1,
  domain: 0.05,
  preferences: 0.15,
  semantic: 0.1,
};

// Rationale (documented per the module's own "document the weights" requirement):
// - requiredSkills (40%): the single most decisive factor - a candidate missing most
//   required skills shouldn't be able to out-rank one who has them, no matter how
//   strong the other dimensions are.
// - experience (15%) and preferences (15%): meaningfully weighted but not dominant -
//   quantitative experience fit and location/work-mode compatibility both matter to a
//   real hire decision, but neither should override a required-skills gap.
// - preferredSkills (10%), seniority (10%), domain (10%): softer signals. Nice-to-have
//   skills, title-derived seniority, and industry-domain overlap all nudge the score
//   without being able to compensate for a large required-skills shortfall (see
//   scoreAggregator.js's weighted-average design and its own tests for the "required
//   skills must dominate" guarantee).
const CURRENT_VERSION = "v2";

const ALGORITHM_VERSIONS = {
  v1: MATCHING_ALGORITHM_V1,
  v2: MATCHING_ALGORITHM_V2,
};

const getAlgorithmWeights = (version = CURRENT_VERSION) => {
  const weights = ALGORITHM_VERSIONS[version];
  if (!weights) {
    throw new Error(`Unknown matching algorithm version "${version}". Available: ${Object.keys(ALGORITHM_VERSIONS).join(", ")}`);
  }
  return weights;
};

export { CURRENT_VERSION as MATCHING_ALGORITHM_VERSION, ALGORITHM_VERSIONS, getAlgorithmWeights };
