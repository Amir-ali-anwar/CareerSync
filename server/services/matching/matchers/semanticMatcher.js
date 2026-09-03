// Extension point for Module F (embeddings + semantic similarity). Module E's algorithm
// config (algorithmVersions.js) gives this dimension a weight of 0, so a null score here
// never needs "renormalizing away" - it simply never contributes. Module F introduces a
// real implementation (comparing stored embeddings) and a new algorithm version with a
// non-zero `semantic` weight; scoreAggregator.js and matchingService.js need no changes
// to support that - only algorithmVersions.js gains a new version entry.
//
// Deliberately NOT a fake/simulated score - the module boundary Module E must not cross
// is "no embeddings, no vector data, no fabricated similarity number."
const semanticMatcher = () => ({ score: null, note: "Semantic matching is not implemented (reserved for Module F)." });

export default semanticMatcher;
