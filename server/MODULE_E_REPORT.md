# Module E Final Report — Hybrid Job Matching Engine

Career Sync backend. Covers the deterministic matching engine built on top of Phase C
(resume intelligence), Phase D (job intelligence), and the P0/P1/P2 hardening pass. See
`AUDIT_REPORT.md`, `TASKS.md`, `PHASE_C_REPORT.md`, and `PHASE_D_REPORT.md` for that
earlier history.

---

## 1. Architecture

```
MatchingService.calculateMatch(candidateProfile, job, jobProfile)
      │
      ├── requiredSkillsMatcher     (vs Job.requiredSkills)
      ├── preferredSkillsMatcher    (vs Job.preferredSkills)
      ├── experienceMatcher         (vs Job.requiredExperience)
      ├── seniorityMatcher          (vs JobProfile.seniority)
      ├── domainMatcher             (vs JobProfile.domains)
      ├── preferenceMatcher         (vs Job.workMode / Job.jobLocation)
      └── semanticMatcher           (stub - always null, Module F's extension point)
      │
      ▼
scoreAggregator.aggregateScores()   (weighted average, excludes null dimensions)
      │
      ▼
MatchResult (0–100 score + structured evidence)
```

**Why 7 separate matcher modules instead of one big function**: each dimension has
independent, testable logic and independent null-handling rules (see §5). Keeping them
as pure functions with a uniform `(candidateProfile, job, jobProfile) => {score, ...details}`
contract meant every matcher could be unit-tested in complete isolation, with zero
database or mocking overhead — which is exactly what the module's own testing
requirements (per-dimension edge cases: aliasing, case differences, missing data, etc.)
needed.

**`matchingService.js`** is deliberately split into a pure core (`calculateMatch` — no
database access, fully deterministic, unit-testable with plain objects) and two thin
DB-aware wrappers: `calculateMatchForCandidateAndJob` (single candidate vs. single job,
used by the new API endpoint) and `calculateMatchesForCandidates` (bulk, one query for
all candidate profiles — no N+1 — used to annotate an employer's applicant list).

**Gap found and fixed during inspection** (per the module's own "inspect before coding"
instruction): the brief's description of `CandidateProfile` assumed a `domains` field
that Phase C never actually added — there was no candidate-side domain data anywhere,
which would have made domain matching permanently inert (always excluded, never
useful). Rather than build a matcher that could never do anything, `CandidateProfile.domains`
was added (small, additive, backward-compatible) and wired into the existing resume
pipeline (`fakeProvider`/`openAiProvider`/`resumeProcessingService`), reusing the exact
`extractDomainsHeuristic` already built for jobs in Phase D — zero duplicated logic.

Similarly, no candidate-side seniority field exists (resumes don't reliably self-report
a level). Rather than add one, `seniorityMatcher` derives candidate seniority
deterministically from `CandidateProfile.yearsOfExperience` via a new
`inferSeniorityFromYearsOfExperience` in `utils/normalization.js` — reusing existing
data instead of expanding the schema further.

---

## 2. Scoring

**Dimensions and v1 weights** (`services/matching/algorithmVersions.js`, the single
source of truth — no weight or version string is hardcoded anywhere else):

| Dimension | Weight | Rationale |
|---|---|---|
| Required skills | 40% | The single most decisive factor — a candidate missing most required skills must not be able to outrank one who has them, regardless of other dimensions. |
| Experience | 15% | Meaningful quantitative signal, but shouldn't dominate. |
| Preferences (location/work mode) | 15% | Real compatibility factor for whether a hire is even feasible. |
| Preferred skills | 10% | Nice-to-have, can only nudge the score. |
| Seniority | 10% | Inferred (not stated), so a softer signal. |
| Domain | 10% | Useful overlap signal, never disqualifying on its own. |
| Semantic | 0% (reserved) | Module F's extension point — not implemented, never contributes in v1. |

**Missing-data handling**: a dimension whose matcher returns `score: null` is *excluded*
from both the weighted sum and the total weight in `scoreAggregator.js` — the score is
a fair average over only the evidence that actually exists, not diluted or inflated by
fabricated neutral values. An *empty* requirement (e.g. a job with no `preferredSkills`
listed at all) is treated differently from *missing* candidate data: an empty
requirement is a real, definitive fact ("nothing to satisfy") and scores a perfect 1;
missing candidate data (no stated experience, no location preference, no
`JobProfile` yet) is genuinely unknown and is excluded rather than guessed at.

Verified by test: a candidate with a large required-skills gap cannot outrank one with
full required-skill coverage no matter how strong their other dimensions are
(`tests/matching/scoreAggregator.test.js`), and the brief's own Candidate A/B/C fixture
ranks A significantly above both B and C (`tests/matching/matchingService.test.js`).

---

## 3. Match Result

**Decision: computed on demand, not persisted.** No AI or network call happens
anywhere in this module, so recomputing a match is cheap (a handful of in-memory
comparisons over two small documents already fetched by `_id`). A persisted
`MatchResult` collection would need version-based staleness/invalidation logic to be
worth its cost, and there is no current consumer (a batch job-ranking feature, a
recommendation engine) that would actually benefit from caching yet. This can be
revisited the moment such a consumer exists — see `TASKS.md`.

`MatchResult` shape (returned inline from both API surfaces, never a separate DB
document): `matchScore`, `componentScores`, `matchedSkills`/`missingRequiredSkills`,
`matchedPreferredSkills`/`missingPreferredSkills`, `experienceComparison`,
`seniorityComparison`, `domainOverlap`, `preferenceCompatibility`,
`matchingAlgorithmVersion`, `candidateProfileVersion`, `jobProfileVersion`,
`candidateProfileStatus`, `jobProfileStatus`.

---

## 4. APIs

- **`GET /api/v1/jobs/:jobId/match`** (new) — talent-only (`authorizePermissions('talent')`).
  Always computes against `req.user.userId`; never accepts a candidate id from the
  request, so there is no IDOR vector to protect against by construction, not by an
  extra check. 404 for a nonexistent job (existing `NotFoundError` convention); 400 for
  a malformed id (existing global `CastError` handling, no manual validation added).
- **`GET /api/v1/applications/job/:jobId`** (existing employer endpoint, modified) —
  each returned application now includes a `match` object. Reuses that endpoint's
  existing `checkPermissions(req.user, job.createdBy)` ownership check rather than
  adding a new authorized route.
- **Deliberately not built**: a candidate-facing "matched jobs across many open
  postings" list endpoint. The brief itself calls this a "potential future route." Doing
  it well would require either persisted/cached scores (which the §3 decision avoids)
  or an unbounded in-memory sort with no real usage pattern to size against yet.

---

## 5. Versioning

Every `MatchResult` carries `matchingAlgorithmVersion` (from
`algorithmVersions.js` — introducing "v2" later means adding a registry entry, not
touching matcher code), plus `candidateProfileVersion` and `jobProfileVersion`
(read directly off the fetched profile documents, or `null` if no profile exists). A
caller can compare these against the current live profile versions to detect a stale
result if one were ever cached — not needed today since nothing is persisted, but the
fields exist so that becomes possible without a schema change later.

---

## 6. Security

- No matching endpoint accepts a candidate id, application id, or user id from the
  request body/query/params — `/jobs/:jobId/match` always uses the authenticated
  session's own `userId`. Verified by test that two different talents each see only
  their own evidence for the same job (`tests/matchApi.test.js`).
- The employer-side annotation reuses `getJobApplications`'s pre-existing
  `checkPermissions` check — a non-owning employer still gets 403, unchanged (verified
  by test, guarding against regression).
- `calculateMatchesForCandidates` fetches candidate profiles scoped exactly to the
  `userIds` array the caller supplies (the applicants of one already-authorized job) —
  never a broader query that could leak unrelated candidates' data.

---

## 7. Tests

| | Count |
|---|---|
| Before this module | 229 (19 suites) |
| Added this module | 90 |
| **After this module** | **319 (29 suites)** |
| Passing | **319/319** |
| Failing | 0 |

Breakdown of the 90 new tests: 70 in `tests/matching/` (7 matcher unit-test files +
`scoreAggregator.test.js`), `tests/matching/matchingService.test.js` (15, including the
brief's own Candidate A/B/C evaluation fixture as a deterministic ranking test),
`tests/matchApi.test.js` (9, HTTP-level authorization/IDOR/annotation tests), plus 3 new
tests for the `CandidateProfile.domains` addition and 9 for
`inferSeniorityFromYearsOfExperience` in `tests/normalization.test.js`.

Two real test bugs were found and fixed during this module's own development: a race
condition where a test used the real HTTP `createJob()` helper (which triggers real
background job-intelligence processing) and then raced it with a manually-inserted
`JobProfile`, non-deterministically corrupting the expected `profileVersion`. Fixed by
creating the `Job` document directly (bypassing the controller/trigger) in those specific
tests, matching the pattern already established in Phase D's own service tests.

---

## 8. Files Changed

**New:**
- `services/matching/algorithmVersions.js`, `scoreAggregator.js`, `matchingService.js`
- `services/matching/matchers/` — 7 matcher files
- `controllers/matchController.js`
- `tests/matching/` — 9 test files, `tests/matchApi.test.js`

**Modified:**
- `utils/normalization.js` — added `SENIORITY_LEVELS`, `inferSeniorityFromYearsOfExperience`
- `models/CandidateProfileModel.js` — added `domains` (the gap fix from §1)
- `services/ai/aiService.js`, `providers/fakeProvider.js`, `providers/openAiProvider.js` — `domains` added to `extractResumeProfile`'s contract
- `services/resume/resumeProcessingService.js` — persists `domains`
- `routes/jobRoutes.js` — new `/jobs/:jobId/match` route
- `controllers/jobApplicationController.js` — `getJobApplications` now match-annotated
- `config/swagger.js`, `BACKEND_FEATURES.md`, `TASKS.md` — documentation

---

## 9. Limitations

- No semantic/embedding-based scoring — `semanticMatcher.js` is a stub by design, weight
  0 in v1.
- No skill-gap analysis, "why you match" LLM explanations, or job recommendations — all
  explicitly out of scope for this module, reserved for later ones.
- No candidate-facing "matched jobs" list endpoint (see §4).
- Domain and seniority signals are only as good as the underlying resume/job-description
  extraction heuristics (fake provider) or model output (real provider, still unverified
  against a live API in this environment) — the matching *architecture* is solid and
  tested; the *input data quality* inherits every limitation already documented in
  `PHASE_C_REPORT.md`/`PHASE_D_REPORT.md`.
- `MatchResult` is never persisted — every request recomputes from scratch. Fine at
  current scale and call volume; would need revisiting if a bulk-ranking consumer
  appears.

---

## 10. Next Module

**Module F (Embeddings + Semantic Search)** is a reasonable next step architecturally —
`semanticMatcher.js` is already a clean, ready extension point, and `matchingService.js`/
`scoreAggregator.js` need no changes to accept it. However, Module F's own stated
prerequisite (vector database or embedding-model access) is still unconfirmed in this
environment, exactly as it was after Phase D — that decision gate hasn't moved. If
credentials become available, the repository is architecturally ready; if not, the next
most valuable work is likely elsewhere (e.g. exposing the candidate-facing matched-jobs
list once a real usage pattern justifies its persistence tradeoffs).

Stopping here per the module brief's explicit instruction — not proceeding into Module F
or later without confirmation.
