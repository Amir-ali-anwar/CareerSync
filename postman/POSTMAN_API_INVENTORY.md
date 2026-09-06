# Career Sync — API Inventory

Source-verified against the code in `server/` (routes, controllers, models, middleware) as of **2026-09-03**, branch `backend-parent`. This is the ground truth the Postman collection was built from — where the Swagger JSDoc comments in the controllers disagree with the actual route files, the discrepancy is called out explicitly below and the **route file wins**.

Base URL (dev): `http://localhost:4000` (`server/.env.example`, `server/config/swagger.js`).

## Totals

| Metric | Count |
|---|---|
| Total implemented API endpoints (excl. health probes) | 37 |
| Total endpoints incl. `/healthz` + `/readyz` | 39 |
| Public, no auth (excl. health) — register, login, logout, verify-Email, resend-verification, org public×3 | 8 |
| Requires the refresh-token cookie pair specifically | 1 (`POST /auth/refresh-token`) |
| Authenticated via `accessToken` cookie | 28 |
| — of which Talent-only (`authorizePermissions('talent')`) | 8 |
| — of which Employer-only (`authorizePermissions('employer')`) | 16 |
| — of which role-agnostic / ownership-checked in controller | 4 (`updateUser`, `updateUserPassword`, `showCurrentUser`, `GET /applications/:id/cv`) |
| Admin-only | 0 — no admin role exists in this codebase (`User.role` enum is only `talent`/`employer`) |
| File upload endpoints | 1 (`POST /jobs/applyForJob/:id`) |
| Async/background-processing endpoints | 2 create/update paths trigger fire-and-forget AI pipelines (see below) |
| Postman requests generated (incl. negative scenarios + role-switch logins) | 73 |

---

## Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/healthz` | Public | Process liveness only, never touches MongoDB. |
| GET | `/readyz` | Public | 200 if MongoDB `readyState === 1`, else 503. |

## Authentication (`/api/v1/auth`) — mounted with no blanket auth middleware; each route opts in individually

| Method | Path | Auth | Role | Body | Rate limit | Purpose |
|---|---|---|---|---|---|---|
| POST | `/register` | Public | — | Yes | 10/hour | Create account (talent or employer). Employer additionally requires `companyName`/`companySize`/`industry`. |
| POST | `/login` | Public | — | Yes | 5/min | Sets `accessToken` + `refreshToken`/`refreshTokenSecret` cookies. Body response is `{ tokenUser }` only — **no token string in JSON**. |
| GET | `/logout` | Public (reads refresh cookie if present) | — | No | — | Revokes the refresh-token DB record and clears all 3 auth cookies. |
| GET | `/verify-Email` | Public | — | No (query: `verificationToken`, `email`) | — | Must be completed before login succeeds. |
| POST | `/refresh-token` | Refresh cookie pair | — | No | — | Rotates refresh token; reuse of an already-rotated token revokes the whole session. |
| PATCH | `/updateUser` | Cookie session | any | Yes | — | Only `email`+`name` accepted; email change forces re-verification. |
| GET | `/showCurrentUser` | Cookie session | any | No | — | Returns decoded JWT payload, not the full DB user. |
| PATCH | `/updateUserPassword` | Cookie session | any | Yes | — | Rejects `newPassword === oldPassword`. |
| POST | `/resend-verification` | Public | — | Yes | 3/hour | |

## Organizations (`/api/v1/organization`) — auth applied per-route, not at the router level

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| POST | `/` | Cookie | employer | Max 4 orgs/user (`MAX_ORGS_PER_USER`); 10/hour rate limit. |
| GET | `/` | Cookie | employer | Own orgs only. |
| PATCH | `/:id` | Cookie | employer (owner) | |
| DELETE | `/:id` | Cookie | employer (owner) | |
| GET | `/:id/followers` | Cookie | employer (owner) | Management view — NOT the public count endpoint. |
| POST | `/:id/follow` | Cookie | talent | Idempotent (200 "Already following"). |
| GET | `/:id/is-following` | Cookie | talent | ⚠️ **Doc mismatch**: the controller's Swagger comment documents `/organization/{id}/check-following`; the live route (`OrganizationRoutes.js`) is `/:id/is-following`. |
| GET | `/public` | Public | — | All organizations, unauthenticated. |
| GET | `/public/:id` | Public | — | Single org public profile. |
| GET | `/public-organizations/:id/followers/count` | Public | — | ⚠️ **Doc mismatch**: Swagger comment documents `/organization/{id}/followers/count`; live route is `/organization/public-organizations/:id/followers/count`. Also returns the full `followers` array, not a numeric count, despite the route name. |

## Jobs (`/api/v1/jobs`) — blanket `authenticateUser` applied in `app.js`, then per-route role check

| Method | Path | Auth role | Notes |
|---|---|---|---|
| POST | `/` | employer | Fire-and-forget triggers async job-intelligence processing. 30/hour limit. |
| GET | `/` | employer | Own jobs only; supports search/jobStatus/jobType/sort/page/limit. |
| GET | `/:id` | employer (owner) | |
| PATCH | `/:id` | employer (owner via query filter — returns 404, not 403, for a non-owner) | Changing `description` re-triggers job-intelligence processing. |
| DELETE | `/:id` | employer (owner) | Transactional delete of the job + its JobApplications + JobProfile where the deployment supports transactions (falls back to sequential deletes on standalone MongoDB / mongodb-memory-server). |
| PATCH | `/:jobId/close` | employer (owner) | |
| GET | `/search` | talent | Plain regex keyword search over open, non-expired jobs. |
| GET | `/search/semantic` | talent | Embedding-based cosine-similarity search; `q` 2–500 chars, `threshold` 0–1. |
| GET | `/:jobId/match` | talent | Match is always computed against the CALLER's own CandidateProfile — no candidate id accepted, so there is no IDOR vector here by design. |
| POST | `/applyForJob/:id` | talent | **Multipart file upload** (`cv` field, PDF/DOC/DOCX, 5MB max). 20/hour limit. Fire-and-forget triggers async resume processing. ⚠️ **Doc mismatch**: the controller's Swagger comment documents `POST /jobs/{id}/apply`; the live route is `POST /jobs/applyForJob/:id`. |

## Job Applications (`/api/v1/applications`) — blanket `authenticateUser` in `app.js`

| Method | Path | Auth role | Notes |
|---|---|---|---|
| GET | `/my` | talent | ⚠️ **Doc mismatch**: Swagger comment documents `/applications/my-applications`; live route is `/applications/my`. |
| GET | `/job/:jobId` | employer (owner) | Each application annotated with a `match` object (batched, no N+1). |
| PATCH | `/:jobId/:applicantId/status` | employer (owner) | Status must be one of `pending/under review/shortlisted/interview/rejected`. |
| PATCH | `/:id/withdraw` | talent (owner) | Only while status is still `pending`/`under review`. |
| GET | `/:id/cv` | **no role guard — ownership checked inside the controller** | Accessible to the applicant OR the owning employer only; everyone else gets 403. This is the one endpoint in the whole API where `authorizePermissions` is deliberately NOT used, in favor of an in-controller check. |

## Talents (`/api/v1/talents`) — blanket `authenticateUser` in `app.js`, then `authorizePermissions('employer')` on every route

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Every applicant across all of the caller's jobs. |
| GET | `/export-applications` | ⚠️ **Doc mismatch**: Swagger comment documents `/talents/export`; live route is `/talents/export-applications`. CSV, capped at 5000 rows, 10/hour limit. |
| GET | `/:talentId` | 404s if that talent never applied to any of the caller's jobs (not a generic profile lookup). |

---

## Authentication mechanism (read before using the collection)

Auth is **cookie-based**, not the Bearer-token flow the task brief initially assumed:

- `POST /login` sets three httpOnly, signed cookies (`accessToken`, `refreshToken`, `refreshTokenSecret`) — see `server/utils/jwt.js`. The JSON response body is only `{ tokenUser: { name, userId, role } }`.
- `authenticateUser` (`server/middlewares/auth.js`) reads `req.signedCookies.accessToken` — there is no `Authorization: Bearer` header path anywhere in the codebase.
- Postman's cookie jar stores/replays these automatically per domain, which is why the collection has no Authorization headers and instead relies on "Login - <role>" requests placed at the start of each folder.
- Consequence: only one session is "active" per domain at a time. Switching actor (talent ⇄ employer ⇄ talent-2) requires re-running the matching login request.

## Endpoints with no direct API surface (exist only as background side-effects)

- **CandidateProfile** (`server/models/CandidateProfileModel.js`) has no CRUD route at all. It is created/overwritten only as a side effect of `POST /jobs/applyForJob/:id` (async resume processing, `services/resume/resumeProcessingService.js`). There is no way to read, list, or hand-edit a CandidateProfile directly via the API.
- **JobProfile** (`server/models/JobProfileModel.js`) similarly has no direct route — it's created/overwritten as a side effect of `POST /jobs` and of any `PATCH /jobs/:id` that changes `description` (`services/job/jobIntelligenceService.js`).
- Both pipelines are strictly **fire-and-forget**: the HTTP response never waits on them. Progress is only observable indirectly via `Job.intelligenceProcessingStatus`, `JobApplication.resumeProcessingStatus`, and the `candidateProfileStatus`/`jobProfileStatus` fields returned by the match endpoint. There is no polling/status endpoint beyond re-reading those parent resources — the collection does not invent one.
- An organization "analytics" endpoint was found stubbed as dead code in `organizationController.js` (removed, never wired into a route) — correctly **excluded** from this collection per the "documented but not implemented" rule. It isn't documented in Swagger either, so there's nothing to list as a gap.

## Async / AI-dependent endpoints

| Trigger | Side effect | Observable via |
|---|---|---|
| `POST /jobs` and `PATCH /jobs/:id` (description changed) | Job-intelligence extraction → `JobProfile` (skills, seniority, domains) + embedding | `Job.intelligenceProcessingStatus`, `GET /jobs/:jobId/match`'s `jobProfileStatus` |
| `POST /jobs/applyForJob/:id` | Resume text extraction + AI extraction → overwrites the caller's single `CandidateProfile` + embedding | `JobApplication.resumeProcessingStatus`, `GET /jobs/:jobId/match`'s `candidateProfileStatus` |
| `GET /jobs/search/semantic` | Reads pre-computed `JobProfile.embedding` (no live embedding call for existing jobs, only for the query text itself) | Jobs without a completed embedding are simply excluded from results, not an error |

**Could not be fully deterministically tested:** exact match-score values and semantic-search rankings depend on the configured AI provider (`OPENAI_API_KEY` unset → deterministic fake provider per `.env.example`; set → real OpenAI calls with non-reproducible-by-us output). Per the task's own instruction not to invent an expected score, the collection asserts response **shape** (`matchScore`, `componentScores`, `candidateProfileStatus`, etc. exist) rather than specific numeric values.

## File upload endpoint detail

`POST /api/v1/jobs/applyForJob/:id` (`server/middlewares/fileuploader.js`):
- Field name: `cv` (exactly this key, single file, `multer().single('cv')`)
- Allowed MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Allowed extensions: `.pdf`, `.doc`, `.docx`
- Max size: 5MB (`LIMIT_FILE_SIZE` → 400 "CV file must be smaller than 5MB")
- A ready-made valid sample exists in the repo at `server/tests/fixtures/valid-sample.pdf`; a corrupt one for negative testing exists at `server/tests/fixtures/corrupt-sample.pdf` (not wired into the collection, since the upload middleware only validates MIME/extension/size, not PDF structural validity — a corrupt-but-correctly-named PDF is accepted the same as a valid one, so it would not exercise a documented distinct code path).

## Endpoints requiring external services / not fully exercisable in this collection

- **Email verification token retrieval**: dev SMTP falls back to an Ethereal test inbox (`.env.example`); the token/preview link is only available via the server's own console log (`sendVerificationEmail.js` logs `Preview URL: ...`). There is intentionally no API to read it back. The collection stops at "paste the token into a variable" — see the Testing Guide.
- **Real embeddings/AI extraction quality**: with no `OPENAI_API_KEY` set, `services/ai` uses a deterministic fake provider (32-dim vectors, no real semantic understanding) — semantic search and match scores will not reflect real-world relevance in that mode. This is a deliberate dev/CI default, not a bug.

## Endpoints intentionally NOT included as active requests

None found. Every route registered in `server/routes/*.js` and wired into `server/app.js` has a corresponding request in the collection. The three Swagger-vs-route mismatches above are all cases of an endpoint that **is** implemented, just at a different path than its own doc comment claims — those are included at their real, working path, with the discrepancy called out in the request description.
