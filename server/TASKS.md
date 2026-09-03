# Career Sync Backend — Fix Task List

Generated from `AUDIT_REPORT.md`. Each task lists the affected file(s), the problem, and the concrete fix. Grouped by priority (P0 → P3), matching Section 19 of the audit.

**Status as of the P0/P1/P2 hardening pass: all applicable P0, P1, and P2 tasks are implemented and covered by passing tests (133/133). P3 was intentionally not started.** See inline notes below for exact resolution details and any deviations from the original plan.

---

## P0 — Must Fix (blockers before calling this production-ready)

- [x] **Lock down `/uploads` static file serving behind authentication**
  - File: `server/app.js:24`
  - Problem: CVs (PII-bearing documents) are served via `express.static` with no auth check — anyone with the URL can download any applicant's CV.
  - Fix: Remove the public `express.static('/uploads', ...)` mount. Add an authenticated route (e.g. `GET /api/v1/applications/:id/cv`) that loads the `JobApplication`, verifies the requester is either the applicant (`talent`) or the owning employer (`job.createdBy`) via `checkPermissions`, then streams the file.
  - **Done:** Static mount removed from `app.js`. New `GET /api/v1/applications/:id/cv` in `jobApplicationController.js` (`getApplicationCV`) checks applicant-or-owning-employer, backed by a small storage abstraction (`utils/cvStorage.js`) that resolves only the file's basename (path-traversal safe). 8 new tests in `tests/jobApplications.test.js` cover applicant access, owning-employer access, non-owning-employer 403, unrelated-talent 403, unauthenticated 401, missing application 404, missing file 404, malformed id 400.

- [x] **Hash refresh tokens before storing them in the database**
  - Files: `server/models/Token.js`, `server/controllers/authController.js:264-268`, `server/controllers/authController.js:300-330` (refresh/rotate logic)
  - Problem: `Token.refreshToken` is stored in plaintext; a DB compromise directly yields usable refresh tokens for every active session.
  - Fix: Hash the refresh token (e.g. `crypto.createHash('sha256')`) before `Token.findOneAndUpdate(...)`/`existingToken.save()`. On refresh, hash the incoming cookie value and compare hashes instead of raw strings.
  - **Done:** New `utils/hashToken.js` (SHA-256). Login/refresh now generate a raw opaque secret, store only its hash, and compare hashes on refresh. Regression test asserts the DB value is a 64-hex-char digest, never the 80-char raw secret.

- [x] **Stop embedding the raw refresh token inside the refresh-token JWT payload**
  - File: `server/utils/jwt.js:37-40`
  - Problem: `{ user, refreshToken }` duplicates the secret inside a second JWT claim, doubling exposure; also shares `JWT_SECRET` between access and refresh tokens with no independent rotation.
  - Fix: Use a separate signing secret (`JWT_REFRESH_SECRET`) for the refresh-token JWT. Don't put the raw opaque token value inside the JWT claims — the JWT's signature already proves authenticity; look the opaque token up (via its hash, per the task above) directly from the signed cookie value.
  - **Done — design decision:** the refresh flow now uses **two cookies**: `refreshToken` (a JWT signed with the new `JWT_REFRESH_SECRET`, carrying only `{ userId }` - no secret in its payload) and `refreshTokenSecret` (the raw opaque bearer secret, in its own signed cookie, validated only via its SHA-256 hash in the DB). This keeps the "JWT proves identity/expiry" and "opaque secret proves possession, checked against a hash" concerns fully separate, per the task's explicit instruction not to embed the opaque token in the JWT payload. `server.js` now requires `JWT_REFRESH_SECRET` at startup alongside `JWT_SECRET`. New `tests/jwt.test.js` proves an access JWT can't be verified with the refresh secret and vice versa; existing rotation/replay tests still pass unmodified in structure.
  - **Bonus fix discovered while testing:** `login`'s `Token.findOneAndUpdate(...)` didn't set `runValidators: true` and captured `req.headers['user-agent']` unguarded; since supertest sends no User-Agent header, this silently persisted a `Token` doc missing the required field, which broke the very next `.save()` in the refresh flow. Fixed by defaulting `userAgent` to `"unknown"` and adding `runValidators: true`.

- [x] **Add missing database indexes**
  - Files: `server/models/JobsModal.js`, `server/models/OrganizationModal.js`, `server/models/JobApplicationModal.js`
  - Problem: `Job.createdBy`, `Organization.createdBy`, and `JobApplication.talent`/`.job` (standalone) are queried constantly with no index, causing full collection scans as data grows.
  - Fix: Add `JobSchema.index({ createdBy: 1 })`, `organizationSchema.index({ createdBy: 1 })`, `JobApplicationSchema.index({ talent: 1 })`, `JobApplicationSchema.index({ job: 1 })`. Also consider a compound index on `Job` for `{ isClosed: 1, applicationDeadline: 1 }` to speed up `searchJobs`.
  - **Done:** All four indexes added (the `{job:1, talent:1}` unique index already covered `job`-alone lookups as its prefix, so only a standalone `talent` index was needed in addition). Evaluated and added the `{isClosed:1, applicationDeadline:1}` compound index - `searchJobs` filters on exactly this pair on every call. New `tests/dbIndexes.test.js` verifies both schema-level declarations and that they're actually built on the live collection (`collection.getIndexes()`).

- [x] **Fix or remove the Docker claim**
  - File: `server/Dockerfile`
  - Problem: File is completely empty (0 bytes); `docker build` fails outright despite `BACKEND_FEATURES.md` claiming "Docker support."
  - Fix: Either write a working multi-stage Node Dockerfile (base image, `npm ci`, copy source, expose port, `CMD ["node","server.js"]`), or remove the "Docker support" bullet from `BACKEND_FEATURES.md` until it's real.
  - **Done:** `node:20-alpine`, `npm ci --omit=dev`, non-root `node` user, `.dockerignore` added. **Not independently verified** - Docker isn't installed in this execution environment, so `docker build`/`docker run` could not be run here. Please verify on a machine with Docker before relying on it.

- [x] **Add a minimal CI pipeline**
  - New file: `.github/workflows/ci.yml`
  - Problem: No CI/CD exists at all — the 836 lines of tests never run automatically.
  - Fix: Add a GitHub Actions workflow that runs `npm ci && npm test` (with `cross-env NODE_ENV=test`) on push/PR to `master`/`backend-parent`.
  - **Done:** Workflow added, triggers on push/PR to `master`/`backend-parent` plus manual dispatch. No lint step (no ESLint config exists in the repo - not invented). mongodb-memory-server needs no external DB service in CI. YAML validated locally; **actual GitHub Actions execution not verified** (would require pushing to GitHub, which was explicitly out of scope for this pass).

- [x] **AI Scope Decision**
  - Files: `server/utils/embedding.js`, product docs
  - Problem: The product is positioned as "AI-powered" but has zero working AI functionality — this is a strategic gap, not just a bug.
  - Fix: Document current state accurately; do not build AI features in this pass.
  - **Done:** Added a "Roadmap — Planned, NOT Yet Implemented" section to `BACKEND_FEATURES.md` explicitly listing AI matching/semantic search/recommendations/resume analysis as not built, and clarifying `utils/embedding.js` is an intentionally-kept scaffold with no caller. `cosine-similarity` and `openai` dependencies kept for the same reason (see cleanup section).

---

## P1 — High Priority

- [x] **Add test coverage for the Organizations module**
  - New file: `server/tests/organizations.test.js`
  - Problem: `organizationController.js` (create/update/delete/follow/public listing) has zero automated tests.
  - Fix: Mirror the pattern in `jobs.test.js`/`talents.test.js`.
  - **Done — 32 new tests** covering create/update/delete, ownership/IDOR checks, `MAX_ORGS_PER_USER`, follow + duplicate-follow, is-following, followers list, and all public endpoints (list/detail/follower-count) including 404/400 edge cases.
  - **Bug found and fixed while writing these tests:** `getOrganizationFollowers` had no ownership check at all - any authenticated employer could view any organization's follower list (IDOR). Fixed by adding `checkPermissions(req.user, organization.createdBy)`, with a regression test.
  - **Scope note:** the task list this was generated from asked for "unfollow" and "duplicate unfollow" coverage, but **no unfollow endpoint exists in the codebase** - only `followOrganization` (with idempotent "already following" handling) is implemented. Per "do not invent functionality that does not exist," no unfollow endpoint was added; only the functionality that actually exists was tested.

- [x] **Add a general-purpose rate limiter**
  - Files: `server/middlewares/rateLimiter.js`, `server/routes/jobRoutes.js`, `server/routes/talentRoutes.js`, `server/routes/OrganizationRoutes.js`
  - Problem: Only `/login`, `/register`, `/resend-verification` are throttled.
  - Fix: Global default limiter + stricter limiters on abuse-prone endpoints.
  - **Done:** `globalLimiter` (300 req/15min/IP) applied app-wide; `jobCreationLimiter`, `applyForJobLimiter`, `csvExportLimiter`, `organizationCreationLimiter` added on their respective endpoints. All `skip` in `NODE_ENV=test` like the existing auth limiters, so the test suite isn't throttled. `tests/rateLimiter.test.js` exercises the real express-rate-limit behavior (with skip disabled) in an isolated app to prove the limiting logic itself works.

- [x] **Add a health-check endpoint**
  - File: `server/app.js`
  - Fix: `GET /healthz` (liveness) and `GET /readyz` (readiness, checks `mongoose.connection.readyState`).
  - **Done:** Both added, registered before body-parsing/cookies/rate-limiting/logging so they stay cheap and aren't throttled or logged. 3 tests in `tests/health.test.js`, including a genuine 503 test (simulates disconnected `readyState` without touching the real socket, so cleanup between tests stays intact). Verified against the live app (`node server.js` + `curl`), not just in-test.

- [x] **Standardize API response envelopes**
  - Files: `server/controllers/jobApplicationController.js:64`, `server/controllers/organizationController.js:792-798`
  - Fix: `getJobApplications` → `applications` key; `SingleOrganization` → `organization` key.
  - **Done, scoped exactly as specified** (checked the client app first - it has zero API calls wired up yet, so nothing else could break). Swagger docs and tests updated to match. Did **not** blindly rename other response shapes across the API - only the two identified.

- [x] **Correct organization 404 behavior**
  - File: `server/controllers/organizationController.js:792-798, 800-812`
  - Fix: 404 instead of 200-with-null for missing organizations.
  - **Done for `getSinglePublicOrganization`** (now throws `NotFoundError`). **`getPublicFollowerCount` was re-checked and found to already correctly 404** on a missing organization - the original audit note was inaccurate for that specific function; no change was needed there (verified via a passing regression test either way).

- [x] **Prevent password hash leakage by default**
  - File: `server/models/User.js:33-37`
  - Fix: `select: false` on the password field; `.select('+password')` at login/password-change.
  - **Done.** Both auth call sites updated. New regression test confirms a default `User.findOne()` returns `password: undefined`.

- [x] **Production environment validation (`CLIENT_URL`/`FRONTEND_URL`)**
  - File: `server/server.js:7-14`
  - Fix: require `CLIENT_URL` or `FRONTEND_URL` when `NODE_ENV=production`.
  - **Done.** `.env.example` created documenting every variable, including this requirement.

---

## P2 — Medium Priority

- [x] **Move CV storage off local disk**
  - File: `server/middlewares/fileuploader.js`
  - **Resolved as a documented abstraction, not a live migration.** No object-storage bucket/credentials exist in this environment to build and test against, and shipping an untested cloud integration would be worse than not shipping one. `utils/cvStorage.js` is the single seam all CV access already goes through (`cvExists`/`streamCv`); its header comment documents the exact 4-step migration path (multer-s3, swap the two functions' internals, keep only the object key on `JobApplication.cv`, config via env vars). Local disk remains the working implementation.

- [x] **Add structured logging with request IDs**
  - File: `server/app.js:20`
  - Fix: request-ID middleware + structured logger + log errors with diagnostic info.
  - **Done, no new dependency added** (`crypto.randomUUID()` + a ~10-line JSON-lines logger in `utils/logger.js` - pino/winston would be overkill at this scale). `middlewares/requestId.js` assigns `req.id` server-side (never trusts an inbound header, to prevent log injection) and returns it as `X-Request-Id`. Morgan replaced with a structured JSON access log via a custom format function, with sensitive query params (`verificationToken`, `token`, `password`, `refreshToken`) redacted before logging (`utils/redactUrl.js`) - this was a security gap discovered while implementing this task (verification tokens were appearing in plaintext in every access log line). `errorHandlerMiddleware` now logs full diagnostics (with stack) for 5xx only - not for expected 4xx client errors, to avoid drowning real problems in noise - and returns `requestId` in every error JSON response for support correlation.

- [x] **Move verification email sending off the synchronous request path**
  - Files: `server/controllers/authController.js`, `server/utils/sendVerificationEmail.js`
  - Fix: fire-and-forget with logged failures.
  - **Done** via a shared `dispatchVerificationEmail()` helper used by `register`, `resendVerificationToken`, and `updateUser`. Regression test forces a rejected send and confirms registration still returns 201 and the user is persisted.

- [x] **Wrap job deletion + cascading application deletion in a transaction**
  - File: `server/controllers/jobController.js` (`deleteJob`)
  - Fix: Mongoose transaction where supported, safe fallback otherwise.
  - **Done.** Uses `mongoose.startSession()` + `withTransaction`; catches the specific "transactions not supported" error MongoDB raises on a standalone server (which is what mongodb-memory-server and most local dev setups are) and falls back to the previous sequential delete in that case. Production against MongoDB Atlas (always a replica set) gets the full transactional guarantee. Verified against the actual standalone mongodb-memory-server used in tests - the fallback path is what's actually exercised by `jobs.test.js`'s cascading-delete test.

- [x] **Use constant-time comparison for verification tokens**
  - File: `server/controllers/authController.js:665`
  - Fix: `crypto.timingSafeEqual` with a length guard.
  - **Done.**

---

## Cleanup (done alongside the above, not deferred to P3)

- [x] Renamed `JobsModal.js` → `JobsModel.js`, `JobApplicationModal.js` → `JobApplicationModel.js`, `OrganizationModal.js` → `OrganizationModel.js` (via `git mv`, preserving history) and updated every import path across controllers/tests.
- [x] Deleted `server/db.js` (confirmed unused stray debug script - not referenced by `package.json`, not imported anywhere).
- [x] Removed the commented-out dead `portfolioPath` code in `jobController.js`, and a dead commented-out import in `User.js`.
- [x] Removed the unreachable `getOrganizationAnalytics` stub (never routed, had no response logic, but was documented in Swagger as if live) - real analytics is a P3 item, not implemented.
- [x] Fixed a corrupted `.gitignore` entry - a mis-encoded `uploads/` line (literal UTF-16-in-UTF-8 mojibake) meant uploaded CVs were **not actually gitignored**. Real bug, now fixed.
- [ ] **`socket.io` and `cosine-similarity` dependencies: kept, not removed.** Decision: both are explicitly named in this project's own roadmap notes for the *next* development phase (AI matching/semantic search will use `cosine-similarity`; real-time messaging will use `socket.io`), which the stop-condition for this task explicitly names as what comes next. Removing and later re-adding them is pure churn. `axios` and `concurrently` also appear unused but were never called out in the original task list, so they were left untouched rather than expanding scope unilaterally.

---

## P3 — Future (intentionally NOT started in this pass)

- [ ] **Build the AI job-matching pipeline**
- [ ] **Build semantic job search**
- [ ] **Build a notification system**
- [ ] **Build real-time messaging**
- [ ] **Build an analytics dashboard**

All P3 items remain exactly as originally scoped - see `AUDIT_REPORT.md` for detail. None were started, per explicit instruction.
