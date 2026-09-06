# Phase D Final Report — Job Intelligence

Career Sync backend. Covers the job-intelligence pipeline built on top of the P0/P1/P2
hardening pass and the Phase C resume-intelligence pipeline (see `AUDIT_REPORT.md`,
`TASKS.md`, and `PHASE_C_REPORT.md` for that earlier history).

---

## Architecture Summary

```
Controller (jobController.js#createJob / #updateJob)
    ↓  fire-and-forget, HTTP response never waits on this
jobIntelligenceService.triggerJobIntelligenceProcessing()
    ↓
jobIntelligenceService.processJobIntelligence()  ← atomically claims the job (pending→processing)
    ↓
aiService.extractJobProfile({ title, description })  ← fake provider (no OPENAI_API_KEY), validated shape
    ↓
normalizeSkillList()  ← shared alias table, utils/normalization.js
    ↓
JobProfileModel.findOneAndUpdate(upsert)  ← one profile per job, overwritten + versioned
```

This mirrors `services/resume/resumeProcessingService.js`'s exact shape rather than
inventing a new pattern — same atomic-claim idempotency guard, same
overwrite-and-version-bump decision on reprocessing, same fire-and-forget trigger style
(matching the already-established pattern for verification emails and resume
processing). No new architectural layer was introduced beyond what Phase C already
established; Phase D reuses it for a second entity (Job) instead of only the first
(JobApplication/CandidateProfile).

**Key design decision — what NOT to duplicate:** `Job` already carries reliable,
employer-entered structured fields (`jobLocation`, `workMode`, `jobType`,
`salaryRange`, and the Phase 4 `requiredSkills`/`preferredSkills`/`requiredExperience`).
`JobProfile` does not re-derive or duplicate any of these. It only holds signal that is
genuinely new: AI-inferred and *normalized* skills (collapsing "ReactJS"/"React.js"/
"React" to one canonical form — something the employer's own raw text input doesn't
do), inferred seniority, domains, and a short responsibilities summary extracted from
free-text `description`.

---

## Files Changed

**New:**
- `utils/normalization.js` — shared skill-alias table + `normalizeSkillList`/
  `normalizeSkillKey`/`canonicalSkillName`/`inferTitleAndSeniority`
- `models/JobProfileModel.js`
- `services/job/jobIntelligenceService.js`
- `tests/normalization.test.js`, `tests/jobProfile.test.js`,
  `tests/jobIntelligenceService.test.js`

**Modified:**
- `models/JobsModel.js` — added `intelligenceProcessingStatus`, `intelligenceProcessingError`
- `utils/constants.js` — renamed `RESUME_PROCESSING_STATUS` → `AI_PROCESSING_STATUS`
  (now shared by both the resume and job pipelines; updated everywhere it's used)
- `services/ai/aiService.js` — added `extractJobProfile()` + `validateJobProfileShape`;
  refactored `analyzeSkillGap` to use the shared `normalizeSkillKey` instead of a local
  ad hoc lowercase-only comparison
- `services/ai/providers/fakeProvider.js` — refactored to use the shared normalization
  module (removed a duplicate local alias table); added `extractJobProfile` plus new
  domain-keyword and responsibility-sentence heuristics
- `services/ai/providers/openAiProvider.js` — added real `extractJobProfile`
  implementation (unverified against a live API, same caveat as the rest of this file)
- `controllers/jobController.js` — `createJob` triggers processing; `updateJob` strips
  client-supplied `intelligenceProcessingStatus`/`Error` (mass-assignment protection)
  and triggers reprocessing only when `description` is part of the update
- `config/swagger.js` — documented `intelligenceProcessingStatus` on the `Job` schema
- `tests/jobs.test.js` — 4 new end-to-end tests
- `tests/fakeAiProvider.test.js`, `tests/aiService.test.js` — new `extractJobProfile` tests
- `BACKEND_FEATURES.md`, `TASKS.md` — updated to reflect this phase

---

## Schema Changes

**`Job`** (additive, backward compatible, defaulted):
- `intelligenceProcessingStatus`: `pending` / `processing` / `completed` / `failed`
- `intelligenceProcessingError`: String

**`JobProfile`** (new model):
- `job` (ObjectId ref Job, required, unique)
- `normalizedTitle` (String, nullable)
- `seniority` (`entry`/`mid`/`senior`/`lead`/`null`)
- `skills`, `requiredSkills`, `preferredSkills` (String[], normalized)
- `yearsOfExperience` (Number, nullable)
- `education`, `certifications`, `domains`, `responsibilities` (String[])
- `processingStatus`, `profileVersion`, `sourceDescriptionHash`

No migration needed for existing `Job` documents — all new fields are optional/defaulted.

---

## API Changes

- `POST /api/v1/jobs` and `PATCH /api/v1/jobs/:id` response shape unchanged; the `job`
  object now additionally includes `intelligenceProcessingStatus`.
- No new endpoint added. `JobProfile` is not exposed via any route yet — deliberately,
  matching the same principle applied to `CandidateProfile` in Phase C ("not exposed
  through unauthorized endpoints" is satisfied by not existing yet, not by
  access-control-after-the-fact).
- Swagger updated to document the new `Job` field; no other contract changes.

---

## Tests Added

**42 new tests** across 6 files:
- `tests/normalization.test.js` — 16 (alias collapsing, title/seniority inference,
  edge cases)
- `tests/jobProfile.test.js` — 5 (model validation, uniqueness constraint)
- `tests/fakeAiProvider.test.js` — 7 new (`extractJobProfile`: title normalization,
  skill/experience/education/domain/responsibility extraction, graceful handling of
  missing input)
- `tests/aiService.test.js` — 2 new (malformed-response rejection, pass-through shape)
- `tests/jobIntelligenceService.test.js` — 8 (success flow, idempotency on re-trigger,
  reprocessing-on-staleness with version bump, no-description failure, AI-service
  failure, malformed-response failure, failure-doesn't-corrupt-existing-data,
  cross-job data isolation)
- `tests/jobs.test.js` — 4 new end-to-end tests through the real HTTP endpoints
  (creation → completed profile; description update → reprocessed with a new version;
  non-description update → no reprocessing; client cannot forge processing status)

**Total: 229/229 passing, 19 suites** (up from 187/16 at the start of this phase, 133 at
the start of the overall engagement).

---

## Database / Index Review

No new indexes added. `JobProfile.job` and `CandidateProfile.user` each already get a
unique index from their `unique: true` schema option. The atomic-claim queries on `Job`
and `JobApplication` filter by `_id` first (already indexed via MongoDB's default `_id`
index), so `intelligenceProcessingStatus`/`resumeProcessingStatus` don't need a
dedicated index at current scale. This should be revisited if a future feature ever
needs to query "all jobs/applications with status X" directly across the whole
collection rather than by a specific `_id`.

---

## Remaining Limitations

- No HTTP endpoint reads `JobProfile` yet — by design, consistent with Phase C's
  `CandidateProfile` precedent.
- Real AI output quality is still unverified — both `extractResumeProfile` and
  `extractJobProfile` run on the fake provider until `OPENAI_API_KEY` is supplied;
  `openAiProvider.js` has never been exercised against a live API in this environment.
- The fake provider cannot distinguish "required" from "preferred" skills in free text
  — both are populated with the same extracted set. A real model-backed provider can do
  meaningfully better here; this is a documented heuristic limitation, not a bug.
- Domain and responsibility extraction are simple keyword/regex heuristics, not real
  NLP — sufficient to exercise the pipeline architecture, not to be trusted for
  production-quality output.

---

## Explicit Scope Boundary Honored

Per the phase brief, this work does **not** implement: embeddings, vector search, the
hybrid matching engine, semantic search, match explanations, skill-gap analysis,
recommendations, resume optimization, application analytics, career intelligence, or
the agentic assistant. The only objective delivered is: **Job description → AI job
profile extraction → JobProfile persistence** — the direct counterpart to Phase C's
resume pipeline.

## Recommended Next Step

Phase E (Hybrid Job Matching Engine), per the brief's explicit ordering. Before writing
matching code, the brief itself calls for two decisions to be made and documented at
that phase's start (not preemptively here): the scoring-weight model across
skills/experience/seniority/domain/preference/semantic dimensions, and the API surface
for exposing match results. Both `CandidateProfile` and `JobProfile` now exist with
normalized, comparable skill lists — the data substrate Phase E needs is in place.

Stopping here pending confirmation that this pipeline is complete, tested, and stable
before Phase E begins.
