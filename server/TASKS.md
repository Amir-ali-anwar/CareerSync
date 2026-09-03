# Career Sync Backend — Live Roadmap

This file is the live roadmap, not a one-time fix list. It's reorganized by status
(`COMPLETED` / `IN PROGRESS` / `NEXT` / `FUTURE`) rather than by the original P0–P3
audit priority, now that the foundational hardening pass is done and the project is
moving into the AI Career Intelligence phase. The original audit remains in
`AUDIT_REPORT.md`; the original priority-ordered fix list (with full problem/fix detail
for every item below) is preserved at the bottom of this file for reference.

**Test baseline: 319/319 passing** (29 files). This number must not go down as new
phases are added — see each phase's own test requirement.

---

## COMPLETED

### Production Hardening (P0/P1/P2, prior pass)
- Authenticated, ownership-checked CV downloads; public static file serving removed.
- Refresh tokens hashed (SHA-256) at rest; access/refresh JWTs use separate secrets.
- `User.password` uses `select: false`; constant-time verification-token comparison.
- Indexes added on `Job.createdBy`, `Organization.createdBy`, `JobApplication.talent`,
  plus a compound `{isClosed, applicationDeadline}` index on `Job`.
- Job deletion + cascading application cleanup run in a transaction where supported,
  with a safe fallback on standalone MongoDB.
- Organizations module: full test coverage added (32 tests); a followers-list IDOR
  found and fixed.
- Rate limiting: global ceiling + endpoint-specific limits (job creation, applications,
  CSV export, organization creation).
- `/healthz` and `/readyz` added and verified against a live instance.
- Structured JSON logging with request-ID correlation; sensitive query values redacted.
- Response envelope inconsistencies fixed (`getJobApplications`, `getSinglePublicOrganization`).
- Production startup validation (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL` in prod).
- Dead code removed: `db.js`, unreachable `getOrganizationAnalytics` stub, commented-out
  dead code; model files renamed `*Modal.js` → `*Model.js`; corrupted `.gitignore` entry fixed.

### Foundation Completion (this pass)
- **Docker:** reviewed against the full checklist (Node version, prod-only deps,
  non-root user, startup command, port, no baked-in secrets, `.dockerignore`) - all
  satisfied. **Added graceful shutdown** (`SIGTERM`/`SIGINT` → drain HTTP connections →
  close the Mongo connection → exit), which was missing. Verified in-process (the
  handler's own close/exit logic is correct); could not verify real OS signal delivery
  end-to-end in this sandbox (Git Bash on Windows does not reliably forward signals to a
  spawned Node child process - irrelevant to the actual deploy target, a Linux
  container, where this is a standard, well-supported pattern). **`docker build`/`docker
  run` still could not be executed - no Docker binary in this environment.**
- **CV storage:** formalized into a genuine provider abstraction
  (`utils/cvStorage.js` selects a provider via `CV_STORAGE_PROVIDER`,
  `utils/storage/localDiskCvProvider.js` is the only implemented provider). Selecting an
  unimplemented provider fails fast with a clear error instead of silently
  misbehaving. 8 new tests (`tests/cvStorage.test.js`) cover provider selection,
  path-traversal safety, and existence checks. Object storage (S3-compatible) remains
  unimplemented - no bucket/credentials exist to build and test against - but the
  migration path is fully documented in `utils/cvStorage.js`'s header comment.

### AI Career Intelligence — Phase A: Data Model Foundation
- **Job model**: added `requiredSkills`, `preferredSkills`, `requiredExperience`
  (years), `workMode` (`remote`/`hybrid`/`onsite`, new `WORK_MODE` constant), and
  `salaryRange` ({min, max, currency}) - all optional, no defaults that would force a
  value onto existing documents. Swagger schema updated to match. 3 new tests confirm
  (a) a job with none of these fields is still valid (backward compatibility), (b) all
  fields persist correctly when provided, (c) an invalid `workMode` is rejected.
- **CandidateProfile model** (`models/CandidateProfileModel.js`, new): one profile per
  user (unique index on `user`), holding `skills`, `yearsOfExperience`, `education[]`,
  `certifications`, `preferredRoles`, `preferredLocations`, `workModePreference`, and
  `resumeText`/`resumeMetadata` (the latter `select: false`, mirroring `User.password`,
  since resume text can be large and most profile reads don't need it). 7 tests cover
  creation, validation, the uniqueness constraint, and the `select: false` behavior.
  **Scoped as schema-only for this milestone** - no CRUD routes/controller were added,
  since nothing yet needs to read or write it through the API; that comes with whichever
  concrete feature (resume pipeline, profile management) needs it first.

### AI Career Intelligence — Phase B: AI Service Abstraction
Per an explicit decision to build abstractions only until real credentials are
available: `services/ai/` now exists as the single boundary every future AI-shaped
operation goes through - no controller or pipeline code will ever call an AI provider
directly.
- **`services/ai/aiService.js`** (`AIService` class): wraps every provider call with a
  timeout (`AI_REQUEST_TIMEOUT_MS`, default 15s), a bounded retry budget
  (`AI_MAX_RETRIES`, default 1, exponential backoff), and structured observability
  logging (operation/provider/latency/retry count/token usage - **never** the prompt or
  resume content itself). `analyzeSkillGap` computes missing skills deterministically
  in this file, not inside the provider - only the human-readable suggestion text comes
  from the AI call, keeping "what's true" separate from "what the LLM says about it."
- **`services/ai/providers/fakeProvider.js`**: a deterministic, dependency-free stand-in
  automatically used whenever `OPENAI_API_KEY` is unset. `generateEmbedding` uses a
  hashed bag-of-words vector (texts sharing vocabulary score more similar under cosine
  similarity than unrelated texts - verified by test); `extractResumeProfile` uses
  regex/keyword heuristics against a small skills vocabulary; `explainMatch` and
  `generateSkillGapSuggestions` are template-based. None of this claims real NLP
  quality - it exists so the whole pipeline can be built and tested without a paid
  external dependency or network access.
- **`services/ai/providers/openAiProvider.js`**: the real implementation (embeddings API
  + structured-JSON chat completions), selected automatically the moment
  `OPENAI_API_KEY` is set - zero code changes needed elsewhere. **Not exercised against
  a live API in this environment** - needs a smoke test against a real key before being
  trusted in production; the file carries an explicit warning to that effect.
- Retired `utils/embedding.js` (the old unused stub) - fully superseded by this module.
- 21 new tests (`tests/aiService.test.js`, `tests/fakeAiProvider.test.js`) cover retry/
  timeout behavior, provider selection, the deterministic/LLM split in `analyzeSkillGap`,
  the fake provider's actual extraction/embedding behavior (including the
  similar-text-scores-higher property), and malformed-response shape validation.

### AI Career Intelligence — Phase C: Resume Processing Pipeline
CV upload → application submission now triggers, fire-and-forget: text extraction →
`AIService.extractResumeProfile` → `CandidateProfile` persistence.
- **`services/resume/textExtraction.js`**: real PDF text extraction via `pdf-parse`
  (new dependency, flagged before adding, confirmed working). DOC/DOCX are a known,
  documented gap (`UnsupportedFileTypeError`) - not silently mishandled, just not
  implemented (would need e.g. `mammoth` for `.docx`; legacy `.doc` has no good pure-JS
  option). Reads CV bytes through `cvStorage.js`'s new `readCvBuffer`, never touching
  the filesystem directly - the storage abstraction stays intact.
- **`services/resume/resumeProcessingService.js`**: the orchestrator, called by
  `jobController.js#applyForJob` (fire-and-forget, same pattern as verification emails -
  the HTTP response never waits on CV parsing + an AI call). Atomically claims an
  application (`resumeProcessingStatus: pending → processing`) before doing anything, so
  concurrent/duplicate triggers are a safe no-op, never double-processed.
- **Idempotency/versioning decision (documented in `CandidateProfileModel.js`)**: exactly
  one `CandidateProfile` per user. A new resume **overwrites** the same profile's fields
  and increments `profileVersion` - it does not fork a new profile or version history.
  `resumeMetadata.sourceApplicationId` always points at whichever application most
  recently produced the current data.
- **Failure handling**: every failure path (extraction failure, unsupported file type, AI
  failure, malformed AI response) sets `resumeProcessingStatus: "failed"` with a short,
  non-sensitive reason on the `JobApplication`, and reflects `processingStatus: "failed"`
  on the `CandidateProfile` **without touching its existing good data** - a failed
  re-processing run never destroys a previously-successful profile.
- `JobApplicationModel` gained `resumeProcessingStatus`/`resumeProcessingError`;
  `CandidateProfileModel` gained `processingStatus`/`profileVersion` (both backward
  compatible, defaulted).
- 16 new tests: `tests/textExtraction.test.js` (4, real `pdf-parse` integration against
  real valid/corrupt PDF fixtures), `tests/resumeProcessingService.test.js` (9,
  orchestration/idempotency/failure/data-isolation), plus 2 new end-to-end tests in
  `tests/jobApplications.test.js` exercising the real HTTP endpoint with a real PDF
  upload through to a persisted `CandidateProfile`.
- No new HTTP endpoint exposes `CandidateProfile` or extracted resume text - by design,
  satisfying "not exposed through unauthorized endpoints" by not existing yet rather
  than being access-controlled after the fact. Building a read endpoint is future work
  once a concrete feature (profile management, matching) needs one.

---

## IN PROGRESS

*(nothing currently - the next item below has not been started)*

---

## NEXT

### AI Career Intelligence — Phase D: Job Intelligence (COMPLETE)
Built the Job-side counterpart to CandidateProfile: `Job.description` (+ title) →
`AIService.extractJobProfile()` → `JobProfileModel`, triggered fire-and-forget on job
creation and again whenever a job update changes `description` (staleness handling).
- **Normalization layer** (`utils/normalization.js`, new, shared): one skill alias
  table (`normalizeSkillList`/`normalizeSkillKey`/`canonicalSkillName`) used by
  `JobProfile` persistence, `fakeProvider`'s skill extraction (refactored to use it,
  removing a duplicate alias table), and `AIService.analyzeSkillGap`'s matching logic -
  not several drifting copies. Also added `inferTitleAndSeniority()` - "Senior Software
  Engineer" and "Sr Software Engineer" both normalize to the same base title with
  seniority extracted separately; seniority is `null` (never a guessed default) when
  there's no signal.
- **`JobProfileModel`** (new): one profile per job (unique index on `job`, mirrors
  `CandidateProfile`'s pattern). Deliberately does NOT duplicate `Job`'s own reliable
  employer-entered fields (`jobLocation`, `workMode`, `jobType`, `salaryRange`) - only
  holds AI-inferred signal free-text `description` doesn't structurally give you:
  `normalizedTitle`, `seniority`, normalized `skills`/`requiredSkills`/`preferredSkills`,
  `yearsOfExperience`, `education`, `certifications`, `domains`, `responsibilities`,
  `processingStatus`, `profileVersion`, `sourceDescriptionHash` (for staleness detection).
- **`services/job/jobIntelligenceService.js`** (new): mirrors
  `resumeProcessingService.js`'s exact shape (atomic claim via
  `Job.intelligenceProcessingStatus`, same failure-handling/idempotency guarantees, same
  overwrite-and-version-bump decision on reprocessing - never forks a new profile).
- **`AIService.extractJobProfile()`** added, with response-shape validation
  (`MalformedAIResponseError`), on both `fakeProvider` (deterministic: skill extraction
  reused from the resume path, plus new domain-keyword and
  responsibility-sentence heuristics) and `openAiProvider` (real implementation,
  unverified against a live API, same as the rest of that file).
- **`updateJob` hardened**: `intelligenceProcessingStatus`/`intelligenceProcessingError`
  are stripped from any client-supplied update body (same mass-assignment protection as
  `createdBy`/`_id`) - a client cannot forge job-intelligence state. Reprocessing
  triggers only when `description` is actually part of the update; an unrelated update
  (e.g. closing the job) leaves the existing `JobProfile` untouched.
- No new HTTP endpoint reads `JobProfile` - same "not exposed until a concrete consumer
  needs it" principle as `CandidateProfile` in Phase C. Authorization/isolation were
  verified at the service level (one job's extracted data never leaks into another
  job's profile) since there's no endpoint yet to test authorization against.
- **Index review**: no new indexes added. `JobProfile.job` and `CandidateProfile.user`
  already get a unique index from `unique: true`; the atomic-claim queries on
  `Job`/`JobApplication` filter by `_id` first (already indexed), so
  `intelligenceProcessingStatus`/`resumeProcessingStatus` don't need their own index at
  current scale. Revisit if a future feature ever queries "all jobs with status X"
  directly across the whole collection.
- 42 new tests: `tests/normalization.test.js` (16), `tests/jobProfile.test.js` (5), 7
  new in `tests/fakeAiProvider.test.js`, 2 new in `tests/aiService.test.js`,
  `tests/jobIntelligenceService.test.js` (8), 4 new end-to-end tests in
  `tests/jobs.test.js` (including one proving the mass-assignment protection).

**Total: 229/229 passing, 19 suites.**

### AI Career Intelligence — Module E: Hybrid Job Matching Engine (COMPLETE)
Deterministic, explainable, versioned candidate↔job matching - `services/matching/`.
No LLM, no embeddings, no external AI calls anywhere in this module.
- **7 independent matchers** (`services/matching/matchers/`), each a pure function
  returning `{score: 0..1|null, ...details}`: `requiredSkillsMatcher`,
  `preferredSkillsMatcher` (against `Job`'s own authoritative fields, never duplicated
  into `JobProfile`), `experienceMatcher`, `seniorityMatcher` (candidate seniority is
  *inferred from `yearsOfExperience`* via a new `inferSeniorityFromYearsOfExperience` in
  `utils/normalization.js` - no candidate-side seniority field exists, so this reuses
  existing data rather than adding one), `domainMatcher`, `preferenceMatcher`
  (work mode + location, against `Job`'s fields), and `semanticMatcher` (a stub - always
  `score: null`, weight 0 in v1 - the Module F extension point).
- **Gap found and fixed during inspection**: the brief's own description of
  `CandidateProfile` assumed a `domains` field that Phase C never actually added (no
  candidate-side domain data existed at all, which would have made domain matching
  permanently inert). Added `CandidateProfile.domains` and wired extraction into the
  resume pipeline (`fakeProvider`/`openAiProvider`/`resumeProcessingService`), reusing
  the exact `extractDomainsHeuristic` already built for jobs - no duplicate logic.
- **`services/matching/scoreAggregator.js`**: weighted average over only the dimensions
  that have data - a `null` (excluded/unknown) dimension is dropped from both the
  numerator and the total weight, so missing data is genuinely neutral (never a
  fabricated penalty or bonus), and a required-skills gap can't be compensated away by
  strong preferred-skills/domain scores (verified by test).
- **`services/matching/algorithmVersions.js`**: single source of truth for weights -
  `MATCHING_ALGORITHM_VERSION = "v1"` is never hardcoded elsewhere. v1 weights:
  requiredSkills 40%, experience 15%, preferences 15%, preferredSkills 10%,
  seniority 10%, domain 10%, semantic 0% (reserved for Module F) - reasoning documented
  in the file itself.
- **Persistence decision: compute on demand, do not persist `MatchResult`.** No AI/
  network calls happen in this module, so recomputation is cheap; a persisted
  collection would need version-based invalidation logic for a benefit (caching) that
  has no real consumer yet. Revisit if/when a recommendation feature needs to rank many
  jobs efficiently.
- **APIs**: `GET /api/v1/jobs/:jobId/match` (talent-only, always the caller's own
  `req.user.userId` - no candidate id is ever accepted from the request, so there is no
  IDOR vector by construction) and `GET /api/v1/applications/job/:jobId` (existing
  employer endpoint) now annotates each applicant with a `match` object, reusing that
  endpoint's existing `checkPermissions` ownership check rather than adding a new route.
  The candidate-facing "matched jobs" list endpoint from the brief's "potential future
  route" language was deliberately NOT built - it would need either persisted/cached
  scores (which the persistence decision above avoids) or an unbounded in-memory sort
  with no real usage pattern to size against yet.
- **Missing/incomplete profiles never error or crash** - `candidateProfileStatus`/
  `jobProfileStatus` (`not_found`/`pending`/`processing`/`completed`/`failed`) are
  reported alongside a best-effort score computed from whatever data does exist (e.g. a
  job with no `JobProfile` yet still gets a real score from `Job`'s own
  `requiredSkills`/`requiredExperience` - only the two `JobProfile`-dependent dimensions,
  seniority and domain, are excluded).
- **No new indexes** - `CandidateProfile.user` and `JobProfile.job` already have a
  unique index each from Phase C/D, which is all the bulk `$in` lookup
  (`calculateMatchesForCandidates`, no N+1) needs.
- 90 new tests: 7 unit-test files per matcher + aggregator (70 tests) in
  `tests/matching/`, `tests/matching/matchingService.test.js` (15, including the
  brief's own Candidate A/B/C evaluation fixture as a deterministic ranking test),
  `tests/matchApi.test.js` (9, HTTP-level authorization/IDOR/annotation tests), plus 3
  new tests for the `CandidateProfile.domains` addition and 9 for
  `inferSeniorityFromYearsOfExperience`.

**Total: 319/319 passing, 29 suites.**

### AI Career Intelligence — Module F: Embeddings + Semantic Search
Not started. `services/matching/matchers/semanticMatcher.js` is the prepared extension
point - Module F needs only to implement it for real and add a new algorithm version
with a non-zero `semantic` weight; no rewrite of `matchingService.js` or
`scoreAggregator.js` required. Still blocked on the same open question as before: no
vector database or embedding-model access is confirmed in this environment.

---

## FUTURE

### AI Career Intelligence Roadmap (blocked on real AI/vector infrastructure)

None of the following can be genuinely completed in this environment as-is: **there is
no `OPENAI_API_KEY`, no object storage credentials, and no vector database access
configured anywhere.** Each item below can have its deterministic/structural parts
built and tested with fakes, but the actual AI behavior cannot be verified until real
credentials are provided. Do not mark any of these "production-ready" without evidence
of it actually working against a real provider.

~~1. Resume processing pipeline~~ — **done, Phase C.**
~~2. AI service abstraction~~ — **done, Phase C (resume) + Phase D (job intelligence).**

3. **Vector search architecture decision** — leaning toward: use MongoDB (already the
   database) rather than standing up a separate vector DB. Two sub-options depending on
   what's actually available at deploy time:
   - MongoDB Atlas Vector Search, if the Atlas tier in use supports it (needs
     verification - not confirmed in this environment).
   - An in-app brute-force cosine-similarity fallback using the already-installed
     `cosine-similarity` dependency, scoped to a filtered candidate pool (never a full
     collection scan) - works on any MongoDB tier, including `mongodb-memory-server` for
     tests, but doesn't scale past a few thousand candidates without an ANN index.
   Whichever is chosen, it must sit behind the same kind of provider abstraction as CV
   storage, so swapping later doesn't touch calling code. **Decision to be finalized and
   documented when this phase starts**, not before - premature commitment here would be
   exactly the "introduce a vector database because it's popular" anti-pattern this
   project is explicitly avoiding.
4. **Embedding pipeline** — Job → embedding, Candidate → embedding, versioned with
   model/timestamp/source metadata so re-embedding on a model change is possible.
5. **Hybrid matching engine** — deterministic scoring (skills, experience, work mode,
   location) combined with semantic similarity; configurable weights, not hardcoded.
   The LLM never determines the score itself.
6. **Match explanations** — LLM explains a score already computed deterministically;
   never the reverse.
7. **Semantic job search** — alongside (not replacing) the existing keyword search.
8. **Personalized recommendations** — reuses the matching engine against a candidate's
   profile.
9. **Resume intelligence** — resume ↔ job comparison reusing the same CandidateProfile
   and matching engine, not a parallel implementation.
10. **Evaluation suite** — a small labeled dataset (candidate↔job match quality) and
    automated metrics (precision@k, ranking quality, explanation grounding) before any
    of the above is called production-ready.
11. **AI observability & cost control** — per-call logging of model/latency/tokens/cost,
    with the same "never log sensitive content" discipline already applied to CV/PII
    elsewhere in this app.
12. **Background processing** — resume parsing, embedding generation, and batch
    matching should not block HTTP requests. Simplest production-appropriate queue, not
    Kafka/K8s.
13. **Notifications** — event-driven (`application_submitted`, `job_match_found`, etc.),
    decoupled from controllers.
14. **Messaging** — recruiter ↔ candidate, only after the core AI workflow is stable.
    Evaluate reusing the already-installed but currently-unused `socket.io` dependency.
15. **Organization analytics** — real metrics from real stored data (applications per
    job, conversion, follower growth); no fabricated numbers.

Each of the above gets its own implementation pass with its own tests, its own
checkpoint report, and its own update to this file - not a single combined change.

---

## Reference: Original P0–P2 Fix List (detail preserved from the initial audit)

Full problem statements and fix rationale for every completed item above are preserved
in git history (see the commits from the hardening pass) and in `AUDIT_REPORT.md`.
