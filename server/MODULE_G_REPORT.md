# Module G — Explainable "Why You Match"

## 1. Architecture

```text
CandidateProfile + Job (+ JobProfile)
              │
              ▼
   Module E: matchingService.calculateMatch()      (unchanged - the only thing that
              │                                      calculates a score)
              ▼
          MatchResult
   (matchScore, componentScores, matchedSkills, missingRequiredSkills,
    matchedPreferredSkills, missingPreferredSkills, experienceComparison,
    seniorityComparison, domainOverlap, preferenceCompatibility,
    matchingAlgorithmVersion, candidateProfileStatus, jobProfileStatus)
              │
              ▼
   Module G: explanationService.buildMatchExplanation()   ← NEW, this module
              │        (pure, synchronous, zero DB/AI calls)
              ▼
          Explanation
   (matchScore, matchLevel, scoreBreakdown, matchedSkills, missingSkills,
    partialMatches, strengths, improvements, summary)
              │
              ▼
   Controller (matchController.js / jobApplicationController.js)
              │
              ▼
        HTTP response: { explanation: {...} }
```

Module G is a thin, pure transform bolted onto the existing Module E output. It adds two
new files and extends two existing controllers/routers - it does not touch
`matchingService.js`, any matcher, `scoreAggregator.js`, `algorithmVersions.js`, or any
Module F embeddings/vector-store code.

## 2. Files Changed

**New:**
- `server/services/matching/explanationService.js` — the explanation builder
- `server/services/matching/matchLevel.js` — centralized match-level classification
- `server/tests/matching/explanationService.test.js` — unit tests
- `server/tests/matching/matchLevel.test.js` — boundary tests
- `server/tests/matchExplanationApi.test.js` — integration/authorization/IDOR tests
- `server/MODULE_G_REPORT.md` — this file

**Modified:**
- `server/controllers/matchController.js` — added `getJobMatchExplanation`
- `server/routes/jobRoutes.js` — added `GET /:jobId/match/explanation`
- `server/controllers/jobApplicationController.js` — added `getApplicantMatchExplanation`
- `server/routes/jobApplicationRoutes.js` — added `GET /:jobId/:applicantId/match/explanation`
- `server/BACKEND_FEATURES.md`, `server/TASKS.md` — documented Module G; corrected a few
  stale roadmap lines that pre-dated Module F actually being wired up (unrelated to
  Module G itself, but directly contradicted by the same file)
- `postman/career-sync.postman_collection.json` — two new requests

**Removed:** nothing.

## 3. Match Evidence

Module G does not compute its own evidence - it reads the evidence Module E's
`calculateMatch` already produces on every call:

| Explanation field | Sourced from `MatchResult` |
|---|---|
| `matchedSkills` (required) / missing (required) | `matchedSkills` / `missingRequiredSkills` (from `requiredSkillsMatcher`, itself built on `utils/normalization.js`) |
| `matchedSkills` (preferred) / missing (preferred) | `matchedPreferredSkills` / `missingPreferredSkills` (from `preferredSkillsMatcher`) |
| experience partial match / strength / improvement | `experienceComparison.status` (`meets`/`exceeds`/`slightly_below`/`significantly_below`/`not_required`/`unknown`) |
| seniority partial match / strength / improvement | `seniorityComparison.distance` (0 = exact, 1 = adjacent/"close", ≥2 = a real gap) |
| domain partial match / strength / improvement | `domainOverlap.matched` vs `domainOverlap.jobDomains` |
| preferences partial match / strength / improvement | `preferenceCompatibility.workMode.score` / `.location.score` |
| semantic strength / improvement | `componentScores.semantic`, gated on the active algorithm version's `semantic` weight being > 0 |
| `scoreBreakdown` | `componentScores` + `algorithmVersions.getAlgorithmWeights(matchingAlgorithmVersion)` |
| `matchLevel` | `matchScore` run through `matchLevel.js`'s thresholds |

No new field is invented. If Module E's evidence doesn't support a claim (e.g. no domain
data on either side), Module G emits nothing for that category rather than guessing.

## 4. Explanation Structure

```jsonc
{
  "explanation": {
    "matchScore": 87,
    "matchLevel": { "level": "strong_match", "label": "Strong Match", "minScore": 75, "maxScore": 89 },
    "matchingAlgorithmVersion": "v2",
    "candidateProfileStatus": "completed",
    "jobProfileStatus": "completed",
    "scoreBreakdown": [
      { "dimension": "requiredSkills", "label": "Required Skills", "score": 90, "weight": 35, "included": true },
      { "dimension": "preferredSkills", "label": "Preferred Skills", "score": 100, "weight": 10, "included": true },
      { "dimension": "experience", "label": "Experience", "score": 100, "weight": 15, "included": true },
      { "dimension": "seniority", "label": "Seniority", "score": 100, "weight": 10, "included": true },
      { "dimension": "domain", "label": "Domain", "score": 50, "weight": 5, "included": true },
      { "dimension": "preferences", "label": "Preferences", "score": 100, "weight": 15, "included": true },
      { "dimension": "semantic", "label": "Semantic Similarity", "score": 88, "weight": 10, "included": true }
    ],
    "matchedSkills": [{ "skill": "React", "type": "required" }],
    "missingSkills": [{ "skill": "Kubernetes", "type": "required", "importance": "high" }],
    "partialMatches": [{ "category": "domain", "candidateValue": ["Fintech"], "requiredValue": ["Fintech", "Healthcare"], "message": "..." }],
    "strengths": [{ "category": "skills", "message": "Matches most required technical skills." }],
    "improvements": [{ "category": "skill", "item": "Kubernetes", "reason": "Required by this job." }],
    "summary": "Strong Match. Your strongest matches are React, TypeScript, and Node.js. The main gaps for this position are Kubernetes."
  }
}
```

**Naming decision:** the field is `matchScore` (not `overallScore`) to match the existing
`GET /jobs/:jobId/match` response exactly - Module G extends, rather than renames, the
established vocabulary (Step 20's "follow existing conventions" rule).

**Importance rule (documented, deliberately simple, per spec):** required skill missing →
`"high"`; preferred skill missing → `"medium"`. No further weighting is applied.

**Partial-match rule (deliberately conservative):** only a genuine near-miss counts -
experience `slightly_below` (candidate ≥ 80% of the required years, from
`experienceMatcher.js`'s own threshold) or seniority `distance === 1` (adjacent tier). A
larger shortfall is real evidence of a gap, not a "close call," so it's surfaced only as
an `improvement`, never dressed up as a partial match.

**Improvements cap:** capped at 8 entries (`MAX_IMPROVEMENTS` in `explanationService.js`)
so this stays "what affected this match," not a full skill-gap report.

## 5. Match Classification

Centralized in `services/matching/matchLevel.js` (no classification existed anywhere in
the codebase before this):

| Score range | Level | Label |
|---|---|---|
| 90–100 | `excellent_match` | Excellent Match |
| 75–89 | `strong_match` | Strong Match |
| 60–74 | `moderate_match` | Moderate Match |
| 40–59 | `weak_match` | Weak Match |
| 0–39 | `poor_match` | Poor Match |

Every boundary (39/40, 59/60, 74/75, 89/90, plus 0 and 100) is asserted explicitly in
`tests/matching/matchLevel.test.js`, along with a test that the five tiers tile the full
0–100 range with no gaps or overlaps.

## 6. API Changes

Two new endpoints, both read-only (`GET`), both reusing the existing evidence rather than
introducing a new score:

| Endpoint | Role | Identity source | Notes |
|---|---|---|---|
| `GET /api/v1/jobs/:jobId/match/explanation` | talent | `req.user.userId` only (no candidate id accepted) | Mirrors `GET /jobs/:jobId/match`'s IDOR-safe design exactly |
| `GET /api/v1/applications/:jobId/:applicantId/match/explanation` | employer | `job.createdBy` via `checkPermissions`, plus the applicant must have a real `JobApplication` for this job | Mirrors `updateApplicationStatus`'s ownership pattern; 404s (not 403) for a candidate id with no application, so it can't be used to probe arbitrary candidates |

**Why two endpoints instead of one generic one, and why not `?includeExplanation=true` on
the existing `/match`:** the talent and employer paths already have different
authorization models and different existing sibling endpoints (`/jobs/:jobId/match` vs
`/applications/job/:jobId`) - adding a matching `/match/explanation` sibling to each
follows the pattern already established in this codebase (see `matchController.js` vs
`jobApplicationController.js`), rather than overloading one endpoint with two different
authorization branches or a query-flag that changes response shape.

No existing endpoint's response shape changed. `GET /jobs/:jobId/match` and
`GET /applications/job/:jobId` are untouched.

## 7. Security

- **Authorization:** both endpoints reuse the exact same middleware/ownership functions
  already used everywhere else (`authorizePermissions`, `checkPermissions`) - no second
  authorization system was introduced.
- **IDOR protection:** the talent endpoint never accepts a candidate id (identity comes
  only from the session, same as `/match`); the employer endpoint requires both job
  ownership (`checkPermissions`) *and* a real `JobApplication` document for the given
  `(jobId, applicantId)` pair, returning 404 (not the job's data) for a candidate who
  never applied - tested explicitly (see below).
- **Private data boundaries:** `explanationService.js`'s only input is the already-computed
  `MatchResult` object, which itself never carries `resumeText`, `embedding`, or any other
  private profile field (verified by `matchingService.js`'s own return shape - Module G
  doesn't need to filter anything out because the private data was never passed in).
  `tests/matchExplanationApi.test.js` includes an explicit test that seeds a
  `CandidateProfile` with `resumeText`/`embedding` and asserts neither appears anywhere in
  the serialized response.
- **No new attack surface on the AI providers:** Module G makes zero calls to
  `services/ai/` - there is nothing here for a prompt-injection or cost-abuse attack to
  target.

## 8. Tests Added

- `tests/matching/matchLevel.test.js` — 3 tests: every tier + boundary, labels, full-range
  tiling with no gaps.
- `tests/matching/explanationService.test.js` — 28 tests: strong-match end-to-end, weak-
  match end-to-end, skill normalization (the spec's React/Node example), experience
  partial/strength/improvement/missing-data, seniority exact/adjacent/gap/missing-data,
  domain full/none/missing-data, semantic v1-vs-v2 weighting (high, low, and unavailable
  embeddings), and score-breakdown shape/ordering.
- `tests/matchExplanationApi.test.js` — 14 tests: happy path + full shape for both
  endpoints, a dedicated no-leak-of-private-data test, 401/403/404/400 for each endpoint,
  the IDOR test (two candidates, each sees only their own evidence), the "no
  CandidateProfile yet" graceful-degradation case, the non-owner-employer 403, and the
  "applicant id with no real application" 404.

## 9. Total Tests

```text
Tests before Module G:  393  (39 suites)
Tests added:            45   (3 new suite files)
Tests passing:          438  (42 suites)
Tests failing:          0
Total suites:           42
```

Both the isolated run (`npx jest tests/matching/matchLevel.test.js
tests/matching/explanationService.test.js tests/matchExplanationApi.test.js` → 45/45
passed) and the full `npm test` run after all Module G changes (→ **438/438 passed, 42
suites, exit code 0**) were actually executed this session - these are not projected
numbers.

## 10. Limitations

Explicitly not implemented in Module G (all deferred to future modules, per the spec's
scope boundary):

- LLM-generated natural-language explanations — the summary is deterministic and
  template-based. AI-generated *rewording* of the same structured evidence remains a
  possible, optional future enhancement, but nothing here calls an LLM.
- Full skill-gap analysis, learning-path or course recommendations.
- Personalized job recommendations, resume optimization, career analytics.
- Persistence/caching of explanations — generated on demand every call, matching the
  existing "computed on demand, not persisted" decision already made for `MatchResult`
  itself (see `TASKS.md`), to avoid staleness whenever a profile, job, or the matching
  algorithm changes.
- Notification/messaging/agent integration of any kind.
- No new embedding infrastructure, vector database, or matching algorithm version was
  introduced - Module G reads `matchingAlgorithmVersion` from `MatchResult` as-is.

## 11. Scope Boundary

Module H (full skill-gap analysis), job recommendations, resume optimization, and any
other future module were **not** started. This module ends at: structured evidence,
matched/missing skills, partial matches, strengths, improvements, score breakdown, match
classification, a deterministic summary, secure API access, authorization, IDOR
protection, tests, and documentation - exactly the Module G scope boundary, nothing more.
