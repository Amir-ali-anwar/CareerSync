# Module H Architecture

## Existing components

CareerSync already contains the core matching stack:

- `CandidateProfileModel` and `JobProfileModel` store normalized profile data, processing state, versions, and embeddings.
- `embeddingService.js` generates and invalidates candidate/job embeddings through the existing `AIService` provider boundary.
- `MongoVectorStore` stores vectors on the existing profile documents and performs cosine-similarity retrieval.
- `matchingService.js` owns the pure match calculation, database-aware match lookup, bulk application scoring, and current recommendation response.
- Matcher modules cover required skills, preferred skills, experience, seniority, domain, preferences, and semantic similarity.
- `scoreAggregator.js` renormalizes configured weights when a signal is unavailable.
- `algorithmVersions.js` is the single source of truth for versioned weights.
- `explanationService.js` produces deterministic structured explanations.
- `skillGapService.js` produces deterministic prioritized gaps and roadmap items.
- Existing routes expose `/candidate-profile/matches`, `/jobs/:jobId/match`, `/jobs/:jobId/match/explanation`, and `/jobs/:jobId/skill-gap`.

## Components reused

Module H reuses the existing normalization utilities, embedding service/vector store, matching matchers, score aggregator, match-level configuration, explanation service, skill-gap service, authentication middleware, and TanStack Query API patterns. No duplicate model or embedding system is introduced.

## Missing before this implementation

- Recommendation retrieval did not use candidate-vector retrieval as a first stage; it scanned a bounded set of open jobs and then scored them.
- The frontend consumed numeric match scores but did not consume the existing explanation or skill-gap endpoints.
- There was no match-details route/view for the structured explanation and roadmap.

## Proposed and implemented architecture

1. Candidate profile processing creates/updates the candidate embedding through the existing embedding service.
2. Recommendation retrieval searches existing job embeddings for the candidate vector, bounded by a configurable retrieval limit.
3. Retrieved job ids are loaded with their job profiles in bounded queries.
4. Existing `calculateMatch` computes the detailed explainable score for each candidate/job pair.
5. Results are ranked by overall score, semantic score, then required-skill score, with deterministic id tie-breaking.
6. If the candidate embedding is unavailable, the service falls back to the existing bounded open-job scan so a profile can still receive useful skill/experience matches.
7. Existing explanation and skill-gap services remain the source of truth for detail output.
8. The frontend adds API methods/hooks and a reusable detail panel on the existing job-detail page; no backend contract is changed.

## Scoring

Current algorithm version `v2` weights required skills 35%, preferred skills 10%, experience 15%, seniority 10%, domain 5%, preferences 15%, and semantic similarity 10%. `scoreAggregator` drops unavailable dimensions and renormalizes remaining weights. Scores are rounded to the inclusive 0-100 range, and match classifications come from `matchLevel.js`.

## Persistence and cache strategy

There is no `JobMatch` persistence model. Matches are deterministic projections of the current candidate/job profiles, so persisting them would introduce invalidation complexity. TanStack Query caches frontend reads. Candidate/job profile versions and embedding metadata provide invalidation evidence; recommendation results are recalculated on request.

## Security

Candidate endpoints derive identity from the authenticated session and never accept a candidate id. Job access remains role/ownership protected by existing middleware. Explanation and skill-gap outputs do not include resume text or embedding vectors.

## API changes

No new public endpoint is required. The existing `/candidate-profile/matches` endpoint now uses vector retrieval first when a usable candidate embedding exists, while preserving its response shape and fallback behavior. Existing match detail endpoints are now consumed by the frontend.

## Database changes

None. Existing profile embedding fields and indexes/storage are reused.
