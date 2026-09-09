# Module H — Skill Gap Analysis & Career Improvement Engine

## 1. Architecture

```text
CandidateProfile + Job (+ JobProfile)
              │
              ▼
   Module E: matchingService.getMatchWithProfiles()   (additive refactor - see §2)
              │
              ▼
     { match: MatchResult, candidateProfile, jobProfile }
              │
              ├────────────────────────────────────────────┐
              ▼                                             ▼
   Module G: buildMissingSkills() / classifyMatchLevel()   candidateProfile.certifications
   (reused directly, not reimplemented)                    jobProfile.certifications
              │                                             │
              └──────────────────┬──────────────────────────┘
                                  ▼
                Module H: skillGapService.buildSkillGapAnalysis()   ← NEW, this module
                     (pure, synchronous, zero DB/AI calls)
                                  │
                                  ▼
                            GapAnalysis
       (summary, gaps[], prioritizedRoadmap[], matchScore, matchLevel, ...)
                                  │
                                  ▼
                   controllers/matchController.js#getJobSkillGapAnalysis
                                  │
                                  ▼
                    HTTP response: { gapAnalysis: {...} }
```

Module H does not touch any matcher, `scoreAggregator.js`, `algorithmVersions.js`, or
Module F's embeddings/vector-store code. Its only structural change to existing code is
additive: `matchingService.js` gained one new export (`getMatchWithProfiles`) so Module H
can reuse the profile fetch `calculateMatchForCandidateAndJob` already made, instead of
re-querying MongoDB. `calculateMatchForCandidateAndJob`'s own exported signature and
return shape are unchanged - it now simply delegates to `getMatchWithProfiles` internally.

## 2. Files Changed

**New:**
- `server/services/career/skillGapService.js` — the gap-detection + prioritization engine
- `server/tests/career/skillGapService.test.js` — unit tests
- `server/tests/skillGapApi.test.js` — integration/authorization/IDOR tests
- `server/MODULE_H_REPORT.md` — this file

**Modified:**
- `server/services/matching/matchingService.js` — added `getMatchWithProfiles` (additive;
  `calculateMatchForCandidateAndJob` refactored to use it internally, behavior unchanged)
- `server/services/matching/explanationService.js` — exported `formatList` (already
  existed internally; exported so Module H's summary builder reuses the same list-
  formatting helper instead of a second copy)
- `server/controllers/matchController.js` — added `getJobSkillGapAnalysis`
- `server/routes/jobRoutes.js` — added `GET /:jobId/skill-gap`
- `server/BACKEND_FEATURES.md`, `server/TASKS.md` — documented Module H
- `postman/career-sync.postman_collection.json`, `postman/POSTMAN_API_INVENTORY.md` — one
  new request + inventory row

**Removed:** nothing.

## 3. Gap Detection

Module H does not run a second skill-comparison pass. `buildRequiredSkillGaps` and
`buildPreferredSkillGaps` call `buildMissingSkills` — imported directly from Module G's
`explanationService.js` — which itself reads `MatchResult.missingRequiredSkills` /
`missingPreferredSkills`, i.e. `requiredSkillsMatcher.js`/`preferredSkillsMatcher.js`'s own
output, built on the existing `utils/normalization.js` alias table. No second
normalization or missing-skills system exists anywhere in Module H.

Experience/seniority/domain gaps read the *same* `MatchResult.experienceComparison` /
`seniorityComparison` / `domainOverlap` objects Module G's `explanationService.js` also
reads — Module H applies its own severity/priority classification on top of that shared
evidence, it does not recompute the underlying comparison.

Duplicate gaps are prevented structurally, not by a dedup pass: each builder emits at
most one gap per distinct missing skill/domain (matching `MatchResult`'s own de-duplicated
arrays), and `buildRequiredSkillGaps`/`buildSeniorityGap`/`buildExperienceGap` each fire at
most once per category.

The one new comparison Module H introduces — not present anywhere in Module E/G — is
**certifications**: `CandidateProfile.certifications` vs `JobProfile.certifications`. This
was judged safe to add because both fields are flat lists of specific named strings (e.g.
`"AWS Certified Solutions Architect"`), making the comparison a plain set-difference,
structurally identical to a skill-gap comparison — not a new fuzzy-equivalency system.
Normalization is deliberately *not* routed through the skill alias table
(`SKILL_ALIASES` in `utils/normalization.js`) since certifications aren't skills and no
alias table exists for them; comparison is case/whitespace-insensitive exact matching
only (`normalizeCertKey` in `skillGapService.js`), a conservative choice documented
in-code.

## 4. Gap Categories

| Category | Source data | Implemented? |
|---|---|---|
| `required_skill` | `Job.requiredSkills` vs `CandidateProfile.skills` (via Module G's `buildMissingSkills`) | ✅ |
| `preferred_skill` | `Job.preferredSkills` vs `CandidateProfile.skills` | ✅ |
| `experience` | `MatchResult.experienceComparison` (`slightly_below` / `significantly_below` only) | ✅ |
| `seniority` | `MatchResult.seniorityComparison` (`distance >= 1` only) | ✅ |
| `domain` | `MatchResult.domainOverlap` | ✅ |
| `certification` | `CandidateProfile.certifications` vs `JobProfile.certifications` | ✅ (new comparison, see §3) |
| `education` | `CandidateProfile.education` (structured) vs `JobProfile.education` (free text) | ❌ deliberately deferred — see §12 |

## 5. Prioritization

**Severity** (`critical` / `high` / `medium` / `low`) and **priority**
(`high` / `medium` / `low`) are assigned by a fixed, documented lookup — not a numeric
formula reverse-fitted to examples:

| Category | Condition | Severity | Priority |
|---|---|---|---|
| `required_skill` | 3+ missing at once | `critical` | `high` |
| `required_skill` | 1-2 missing | `high` | `high` |
| `preferred_skill` | any missing | `medium` | `medium` |
| `experience` | `significantly_below` | `high` | `high` |
| `experience` | `slightly_below` (≥ 80% of requirement) | `medium` | `medium` |
| `seniority` | `distance >= 2` | `high` | `high` |
| `seniority` | `distance === 1` | `medium` | `medium` |
| `domain` | no overlap at all | `medium` | `medium` |
| `domain` | partial overlap | `low` | `low` |
| `certification` | missing | `medium` | `medium` |

Rationale: required skills are the single most decisive matching dimension
(`algorithmVersions.js`'s own weighting), so they're always `high` priority regardless of
count — the count only distinguishes "critical" (a broad, structural mismatch) from
"high" (one gap) for severity. Preferred skills, by the matching engine's own design, can
only ever nudge a score, never block one — so they're always `medium`, never `high`, no
matter how many are missing. Certifications get a flat `medium`: `JobProfile` has no
required-vs-preferred split for certifications (unlike skills), so there's no reliable
signal to rank one certification above another.

**Roadmap ordering (`prioritizedRoadmap`)**: gaps are sorted by an internal, never-exposed
`priorityScore = PRIORITY_RANK[priority] * 1000 + round(dimensionWeight * 100)`, where
`dimensionWeight` comes straight from `algorithmVersions.getAlgorithmWeights()` for the
match's own algorithm version (certifications, having no matching-engine weight, always
score 0 on this second term). This guarantees every `high`-priority gap ranks above every
`medium`, which ranks above every `low` (the primary key), while *within* a tier, the
matching engine's own dimension weight breaks ties (e.g. a missing required skill, weight
.35 in v2, outranks a large seniority gap, weight .10, even though both are `high`
priority) — directly satisfying the spec's "align with existing matching weights"
requirement without inventing a second weighting scheme.

**Stable ordering**: `Array.prototype.sort` has been a stable sort since ES2019. Gaps are
built in a fixed sequence (required skills in the job's own list order, then preferred,
then experience, then seniority, then domain in list order, then certification in list
order) *before* sorting, so equal-`priorityScore` gaps keep that relative order — this is
asserted directly in `tests/career/skillGapService.test.js`.

## 6. Career Improvement Roadmap

`prioritizedRoadmap` is a thin, numbered projection of the same sorted `gaps` array — not
independently computed, so the two can never drift:

```json
{ "rank": 1, "category": "required_skill", "item": "Kubernetes", "priority": "high", "impact": "high" }
```

`impact` intentionally **mirrors** `priority` (both derived from the same dimension-
weight + severity evidence) rather than a simulated "your score would become 80" claim —
see §7's Step 17 discussion and §12's Limitations. `recommendedAction` on each full gap
object is a generic, evidence-based action type (`skill_development`,
`experience_development`, `domain_experience_development`, `certification_development`),
never an external course/platform recommendation.

## 7. API Changes

One new endpoint:

| Endpoint | Role | Identity source | Notes |
|---|---|---|---|
| `GET /api/v1/jobs/:jobId/skill-gap` | talent | `req.user.userId` only (no candidate id accepted) | Mirrors `GET /jobs/:jobId/match`/`/match/explanation`'s IDOR-safe design exactly |

Response envelope: `{ "gapAnalysis": {...} }`, following the same
`{ resourceName: {...} }` convention as `{ match }` and `{ explanation }`. No existing
endpoint's response shape changed.

**Field-naming note:** the spec's own Step 6/7 example used `"priority"` for a gap's
qualitative level (`"high"`/`"medium"`) while its Step 19 roadmap example reused
`"priority"` for a *numeric rank* (`1`, `2`, `3`...) — two different meanings under one
name. To avoid that ambiguity in the real response, this implementation keeps `priority`
as the qualitative level everywhere (including in `prioritizedRoadmap` items) and uses
`rank` for the numeric position. This is a deliberate, documented adaptation of the
spec's own conceptual examples, not a deviation from an existing Career Sync convention.

**Why no `?includeExplanation`-style flag or reuse of `/match/explanation`:** skill-gap
analysis is a distinct resource with its own shape (`summary`/`gaps`/`prioritizedRoadmap`
vs. `strengths`/`partialMatches`/`scoreBreakdown`) and, per §8, a *different*
authorization surface than the explanation endpoint (no employer-facing counterpart at
all) — folding it into `/match/explanation`'s response would either force it into every
caller's response (including employers, who shouldn't receive it) or require a role-
conditional response shape, which is worse for API consistency than a sibling endpoint.

## 8. Security

- **Authorization:** reuses `authorizePermissions('talent')` exactly as `/match` and
  `/match/explanation` do — no second authorization system.
- **IDOR protection:** identity comes only from `req.user.userId`; no candidate id is
  ever accepted in the URL or body. Tested explicitly (two candidates against the same
  job, each sees only their own gaps).
- **Candidate privacy — no employer-facing endpoint, by design:** the spec's own default
  is "skill gap analysis is candidate-private" unless an existing business rule
  *explicitly* supports employer access. Module G's employer-facing explanation endpoint
  exists because an employer evaluating an applicant genuinely needs to see *why* a
  candidate matches (that's the entire point of the applicant-review flow — see
  `getJobApplications`'s existing `match` annotation, which predates Module G). A
  candidate's *personal improvement roadmap* — "what should I learn next" — is
  self-directed career advice with no equivalent existing business rule making it
  employer-relevant; showing it to an employer would (a) not be needed for a hiring
  decision Module G's explanation doesn't already support, and (b) reveal candidate-
  initiated intent (what they're planning to learn) with no consent basis. This
  implementation therefore does **not** add an employer-facing skill-gap endpoint,
  documenting the decision here explicitly per the spec's own instruction.
- **Private data boundaries:** `skillGapService.js`'s only inputs are the already-computed
  `MatchResult` (which never carries `resumeText`/`embedding` — see Module G's own
  report) plus two flat certification-name arrays. A dedicated test seeds a
  `CandidateProfile` with `resumeText`/`embedding` and asserts neither ever appears in the
  serialized response.
- **No new AI attack surface:** Module H makes zero calls to `services/ai/`.

## 9. Persistence Decision

**Dynamic — generated on demand, no new model.** A `SkillGapModel` or similar would
immediately risk staleness against any of: a new resume upload (changes
`CandidateProfile.skills`/`certifications`/`profileVersion`), a job description edit
(changes `JobProfile`), or a matching-algorithm version bump. This is the same reasoning
already documented for `MatchResult` itself (`TASKS.md`, Module E) and for Module G's
`Explanation` — Module H simply follows the established precedent rather than
re-litigating it. The analysis is cheap enough to compute on every request (one already-
made DB fetch, then pure in-memory transforms) that persistence would add staleness risk
for no real performance benefit.

## 10. Tests Added

- `tests/career/skillGapService.test.js` — 36 unit tests: a multi-gap end-to-end scenario
  (required/preferred/experience/certification gaps, roadmap ordering, summary), a
  "meets every required skill" case, a "zero gaps" case, required-skill severity
  (critical at 3+, high at 1-2), skill normalization (the spec's React/Node.js example),
  experience gap variants (exceeds/meets/slightly-below/significantly-below/missing-data/
  missing-requirement), seniority gap variants (exact/higher/lower-by-1/lower-by-2+/
  missing-data), domain gap variants (exact/partial/none/missing-data), an explicit
  "education is not implemented" assertion, certification gap variants (present/missing/
  no-requirement), boundary cases (empty arrays, a job's own duplicate/aliased skills),
  and algorithm-version propagation (v1 vs v2).
- `tests/skillGapApi.test.js` — 10 integration tests: happy path + full shape, a
  certification-gap end-to-end test (Job/JobProfile constructed directly to avoid racing
  the fire-and-forget job-intelligence pipeline - see the in-file comment), a dedicated
  no-leak-of-private-data test, 401/403/404/400, the IDOR test, the "no CandidateProfile
  yet" graceful-degradation case, and the "meets every required skill -> no gap" case.

## 11. Total Tests

```text
Tests before Module H:  438  (42 suites)
Tests added:            46   (2 new suite files)
Tests passing:          484  (44 suites)
Tests failing:          0
Total suites:           44
```

Both the isolated new-test run (`npx jest tests/career/skillGapService.test.js
tests/skillGapApi.test.js` → 46/46 passed) and the full `npm test` run after all Module H
changes were actually executed this session — see the session's command output for the
full-suite result.

## 12. Limitations

- **Education gap analysis — evaluated, not implemented.**
  `CandidateProfile.education` is a structured array (`{degree, field, institution,
  graduationYear}`); `JobProfile.education` is a flat array of free-text, AI-extracted
  strings (e.g. `"Bachelor's degree preferred"`). There is no degree-ranking/equivalency
  model anywhere in Module E, and building one here would mean inventing new
  equivalency rules the spec explicitly warns against ("do not assume degree
  equivalency... do not implement complex education ranking unless existing data already
  supports it"). Rather than half-implement a comparison that could produce a
  factually wrong claim (e.g. treating a free-text sentence as a comparable "rank"),
  this category was left out entirely. Revisit if/when Module E ever gains a structured,
  ranked education-requirement field.
- **Score simulation — not implemented.** The spec makes this explicitly optional and
  conditions it on "clearly labeled as simulated" and "does not duplicate matching
  logic." Implementing it correctly would mean re-running `calculateMatch` against a
  hypothetically modified profile, which adds real complexity and a duplicate-effort
  risk for a feature the spec itself says to skip "otherwise." `impact` is a qualitative
  label only, never a predicted score.
- **Aggregated/cross-job gap analysis** ("which skills should I learn across every job I
  might fit") — out of scope per the spec's own Step 22; would need new query patterns
  and is left for a future module.
- **No course/learning-platform recommendations, learning paths, or LLM-generated
  advice** — `recommendedAction` is a generic action type only.
- **No employer-facing skill-gap endpoint** — see §8's Security section for the
  reasoning; this is a deliberate default, not an oversight.

## 13. Scope Boundary

Module H implements exactly: single-job skill gap analysis, required/preferred skill
gaps, gap prioritization, severity, impact, experience/seniority/domain gap analysis,
certification gap analysis, a career improvement roadmap, deterministic recommendations,
authorization, IDOR protection, tests, and documentation. No course/learning
integrations, job recommendations, resume optimization, career analytics, notifications,
agents, new embedding infrastructure, or new matching algorithm were implemented. The
next module (aggregate/cross-job skill-demand analysis, deeper career intelligence) was
not started.
