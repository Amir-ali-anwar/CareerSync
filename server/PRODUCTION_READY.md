# Career Sync Backend — Production-Ready Features

Snapshot after the P0/P1/P2 hardening pass (see `AUDIT_REPORT.md` for the original audit and `TASKS.md` for the full fix history). This document lists only what is genuinely production-ready today, with the evidence behind that claim. Anything not listed here should be assumed **not** production-ready.

**Test suite: 133/133 passing** across 10 files, run against a real MongoDB (via `mongodb-memory-server`) with real HTTP requests (Supertest) — not mocked shortcuts.

---

## ✅ Production-Ready Features

### Authentication & Session Management
- Register → email verification (10-min expiring token, constant-time comparison) → login → logout.
- JWT access tokens (`JWT_SECRET`) and JWT refresh tokens (separate `JWT_REFRESH_SECRET`) — a leaked signing key for one can't be used to forge the other.
- Refresh tokens stored as SHA-256 hashes only; the raw opaque secret never touches the database. Rotation and reuse/replay detection both verified by tests.
- Password hashing (bcrypt) with `select: false` on the field by default — a stray `User.find()` can no longer leak a hash.
- Login/register/resend-verification rate-limited; verification email sending is fire-and-forget so an SMTP outage can't turn a successful registration into a client-facing 500.
- **Evidence:** `tests/auth.test.js` (33 tests), `tests/jwt.test.js` (4 tests).

### Job Posting & Management (Employer)
- Full CRUD, ownership-scoped listing/search/sort/pagination, application-deadline enforcement, close-for-applications.
- IDOR-protected: verified a non-owner employer cannot view, update, or delete another employer's job.
- `createdBy` and `{isClosed, applicationDeadline}` now indexed — the two hottest query paths.
- Job deletion + its cascading application cleanup run inside a MongoDB transaction where the deployment supports it (falls back safely on standalone MongoDB).
- **Evidence:** `tests/jobs.test.js` (23 tests), `tests/dbIndexes.test.js` (6 tests).

### Job Applications
- CV upload (type/size validated), duplicate/rejected-reapplication guards, status transitions, withdrawal restricted to pre-decision states.
- **CVs are no longer publicly reachable.** `GET /api/v1/applications/:id/cv` is the only access path, enforced to the applicant or the owning employer only, with path-traversal-safe file resolution.
- Job-creation and CV-upload endpoints rate-limited against spam/abuse.
- **Evidence:** `tests/jobApplications.test.js` (26 tests, 8 of them specifically for the new CV endpoint's access control).

### Talent / Candidate Management (Employer view)
- Paginated applicant listing, IDOR-safe single-talent lookup, CSV export capped at 5,000 records and rate-limited.
- **Evidence:** `tests/talents.test.js`.

### Organization Profiles
- Full CRUD, per-user cap (4 orgs), follow/duplicate-follow handling, public listing/detail/follower-count.
- **Newly fully tested this pass** (previously zero coverage) — 32 tests covering every endpoint, every ownership check, and public-endpoint 404 behavior.
- **IDOR fixed:** the followers-list endpoint had no ownership check at all before this pass; any employer could view any other org's followers. Now ownership-checked and regression-tested.
- Dead `getOrganizationAnalytics` stub (unrouted, would have hung any request) removed rather than left half-built and misleadingly documented in Swagger.
- **Evidence:** `tests/organizations.test.js` (32 tests).

### API Reliability & Operations
- **Rate limiting:** a global 300 req/15min/IP ceiling, plus dedicated limits on job creation, job applications, CSV export, and organization creation — not just the auth endpoints.
- **Health/readiness:** `GET /healthz` (liveness, no DB dependency) and `GET /readyz` (checks MongoDB connection state), both verified against a live running instance.
- **Structured logging:** JSON access logs and error logs, each carrying a server-generated `X-Request-Id` for correlation; sensitive query values (verification tokens, etc.) are redacted before anything is logged.
- **Error responses:** consistent `{ msg, requestId }` shape; only genuine 5xx failures get full stack-trace logging, keeping expected 4xx client errors from drowning out real problems.
- Response envelopes standardized where they were inconsistent (`getJobApplications`, `getSinglePublicOrganization`).
- **Evidence:** `tests/rateLimiter.test.js`, `tests/health.test.js`, `tests/errorHandler.test.js`.

### Configuration & Startup Safety
- Server refuses to start if `JWT_SECRET` or `JWT_REFRESH_SECRET` is missing, and refuses to start in production without `CLIENT_URL`/`FRONTEND_URL` set (no silent localhost fallback).
- `.env.example` documents every environment variable the app actually uses.

### Containerization & CI (built, execution not independently verified here)
- Production Dockerfile (`node:20-alpine`, non-root user, secrets injected at runtime only) and `.dockerignore` — replacing what was previously an empty, non-functional file.
- GitHub Actions workflow running the full test suite on every push/PR.
- **Caveat:** this sandbox has no Docker binary, so `docker build`/`docker run` were not run here; verify on a machine with Docker before relying on it. CI execution likewise hasn't been observed running on GitHub yet.

---

## 🚫 Explicitly NOT Production-Ready

- **AI features** (job matching, semantic search, recommendations, resume analysis) — zero implementation beyond one unused embedding helper. See `BACKEND_FEATURES.md`'s roadmap section.
- **CV storage** — still local disk. A storage abstraction (`utils/cvStorage.js`) exists so migrating to S3-compatible object storage later doesn't touch calling code, but the migration itself hasn't happened (breaks in any horizontally-scaled deployment).
- **Messaging, notifications beyond transactional email, analytics dashboard, monetization** — not built.
- **Docker/CI** — built but not executed end-to-end outside this session (see caveat above).

---

## Status of `TASKS.md`

**Not deleted.** All P0 and P1 and P2 tasks in `TASKS.md` are complete, but its P3 section (AI matching, semantic search, notifications, messaging, analytics dashboard) is explicitly still open — those were intentionally deferred, not finished. `TASKS.md` stays as the live record of that remaining work; it will make sense to retire it once P3 is actually tackled or re-scoped.
