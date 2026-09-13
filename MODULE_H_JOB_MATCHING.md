# Module H: AI-Powered Job Matching and Recommendations

## Architecture

Module H is implemented as a deterministic recommendation layer over CareerSync's existing profile, embedding, matching, explanation, and skill-gap services.

```text
CandidateProfile
  -> existing embeddingService / MongoVectorStore
  -> bounded semantic retrieval of completed JobProfiles
  -> Job + JobProfile batch load
  -> existing matchingService.calculateMatch
  -> weighted score + classification
  -> deterministic ranking
  -> /candidate-profile/matches
```

For a candidate without a usable embedding, the service falls back to the existing bounded open-job scan. This preserves useful skill/experience recommendations while embeddings are pending or unavailable.

## Matching algorithm

The current algorithm registry is `server/services/matching/algorithmVersions.js`. Version `v2` uses:

- Required skills: 35%
- Preferred skills: 10%
- Experience: 15%
- Seniority: 10%
- Domain: 5%
- Preferences: 15%
- Semantic similarity: 10%

The score aggregator excludes unavailable dimensions and renormalizes the remaining weights. It never treats missing experience, profile, or embeddings as a false zero. Scores are rounded to 0-100.

Classifications are centralized in `matchLevel.js`:

- 90-100: Excellent Match
- 75-89: Strong Match
- 60-74: Moderate Match
- 40-59: Weak Match
- 0-39: Poor Match

## Skill matching

Required and preferred skill matchers reuse `utils/normalization.js`. Exact, case-insensitive, and configured alias matches are normalized before comparison. The result exposes matched and missing required/preferred skills. No second skill normalization system was introduced.

## Experience and education

Experience uses the structured `yearsOfExperience` and `requiredExperience` fields. Missing candidate experience is represented as unknown and excluded from the aggregate score. Education is stored but is not currently a scored dimension because the job-side requirement is not structured enough for a defensible comparison; no fake education score is emitted.

## Explanation and career guidance

`explanationService.js` transforms the match evidence into score breakdown, strengths, matched skills, missing skills, partial matches, improvements, and a deterministic summary. `skillGapService.js` builds a prioritized roadmap from required/preferred skills, experience, seniority, domains, and certifications. Neither service uses an LLM or invents candidate evidence.

The frontend now lazily consumes both existing endpoints from the job detail match panel.

## Recommendation retrieval and ranking

The existing `/api/v1/candidate-profile/matches` endpoint remains the recommendation API. It now:

1. Searches existing job embeddings for the candidate embedding, up to 50 jobs.
2. Filters to open jobs with completed job profiles.
3. Loads retrieved jobs and profiles in bounded batch queries.
4. Calculates detailed matches using the existing engine.
5. Filters by `minScore`.
6. Ranks by overall score, semantic score, required-skill score, and stable job id.
7. Paginates the result. This is a bounded staged recommender, not a guarantee that every open job is scored; the fallback scan is used when vector retrieval is unavailable or yields no eligible jobs.

If vector retrieval cannot produce candidates, the endpoint falls back to a maximum 500-job open-job scan. The response includes `usedSemanticRetrieval` for observability.

## Persistence and invalidation

No `JobMatch` model was added. Matches are deterministic projections of current profile/job state, so persistence would need aggressive invalidation. Existing profile versions and embedding metadata provide change evidence. TanStack Query caches frontend requests, and profile/job mutations invalidate relevant queries.

## Security

All candidate-facing matching endpoints derive the candidate identity from the authenticated session. No candidate id is accepted from the URL or request body. Explanations and gap analyses omit resume text and embedding vectors. Existing role middleware continues to protect talent-only routes.

## APIs

Existing endpoints used by Module H:

- `GET /api/v1/candidate-profile/matches?page=&limit=&minScore=`
- `GET /api/v1/jobs/:jobId/match`
- `GET /api/v1/jobs/:jobId/match/explanation`
- `GET /api/v1/jobs/:jobId/skill-gap`

No duplicate endpoint was created.

## Provider limitation

When `OPENAI_API_KEY` is absent, the existing AI service selects the deterministic fake provider. Embeddings and AI-shaped extraction remain structurally testable but are not real model output. Production deployments must explicitly configure and validate the intended provider.
