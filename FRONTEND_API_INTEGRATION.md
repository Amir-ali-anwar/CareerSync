# CareerSync — Frontend API Integration Reference

Source-verified against `server/routes/*.js`, `server/controllers/*.js`, `server/models/*.js`, `server/middlewares/*.js`, and cross-checked against `postman/POSTMAN_API_INVENTORY.md` (dated 2026-09-03). Where Swagger JSDoc comments in the controllers disagree with the live route files, **the route file wins** — every path below is the actual live path, not the doc comment.

Base URL (dev): `http://localhost:4000` — configured via `NEXT_PUBLIC_API_URL` on the frontend. All routes below are relative to this base.

## 0. Authentication model (read this first)

Auth is **cookie-based**, not Bearer-token:

- `POST /api/v1/auth/login` sets three httpOnly, signed cookies: `accessToken`, `refreshToken`, `refreshTokenSecret`. The JSON body returned is only `{ tokenUser: { name, userId, role } }` — **no token string ever appears in a JSON response**, so the frontend cannot and must not try to read/store a token itself.
- Every authenticated request must be sent with `credentials: 'include'` (fetch) / `withCredentials: true` (axios) so the browser attaches these cookies automatically. There is no `Authorization: Bearer` header path anywhere in this backend.
- `accessToken` expires per `JWT_EXPIRES_IN` (default 1d). When it expires, protected requests return `401`. The frontend's API client must catch a `401`, call `POST /api/v1/auth/refresh-token` (which reads the `refreshToken`/`refreshTokenSecret` cookie pair and rotates them), and retry the original request once. If refresh also fails, force logout and redirect to `/login`.
- Cookies are not marked `Secure` outside production and have no explicit `SameSite`, so they default to `Lax`. `localhost:3000` ↔ `localhost:4000` count as same-site (registrable domain matches, port is ignored for this purpose), so this works in local dev. **If frontend and backend ever ship on different domains in production, the backend cookies need `SameSite=None; Secure` or a same-domain reverse proxy** — flagged in `MISSING_BACKEND_FEATURES.md`.
- `GET /api/v1/auth/showCurrentUser` returns the **decoded JWT payload** (`{ name, userId, role }`), not a fresh DB read — it will not reflect a profile field that isn't in the token.
- Two roles exist: `talent` and `employer`. There is no `admin` role. The two roles see almost entirely different UI (job seeker vs. job poster) — this drives the whole app's navigation and route protection.

## 1. Health

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/healthz` | none | `{ status: "ok" }` — liveness only |
| GET | `/readyz` | none | `200 { status: "ok" }` or `503 { status: "error" }` — Mongo connectivity |

Not used by any page directly; useful only for an infra/status check if ever added.

## 2. Authentication (`/api/v1/auth`)

> **Updated 2026-09-07** — email verification and password reset moved from clicked-link tokens to 6-digit OTP codes; login can now be gated by 2FA; sessions are now genuinely per-device (a user can be logged in on several devices at once). See §12 for the net-new 2FA/session/Google endpoints, which currently have **no frontend UI** — build against the contracts below when picking that up.

| Method | Path | Auth | Rate limit | Body | Success response |
|---|---|---|---|---|---|
| POST | `/register` | public | 10/hour | see below | `201 { msg }` |
| POST | `/login` | public | 5/min | `{ email, password }` | `200 { tokenUser }` + sets cookies, **or** `200 { requiresTwoFactor: true, tempToken }` if the account has 2FA enabled (no cookies set yet — see §12) |
| GET | `/logout` | public | — | — | `200 { msg: "user logged out!" }` + clears cookies — revokes only **this** session, other devices stay logged in |
| POST | `/verify-Email` | public | 10/hour | `{ email, otp }` — 6-digit code emailed on register | `200 { msg: "Email Verified" }` |
| POST | `/refresh-token` | refresh cookie pair | — | — | `200 { tokenUser }` + rotates cookies |
| PATCH | `/updateUser` | cookie session | — | `{ email, name }` (both required) | `200 { user, msg? }` — changing email re-sends a verification OTP |
| GET | `/showCurrentUser` | cookie session | — | — | `200 { user: { name, userId, role } }` |
| PATCH | `/updateUserPassword` | cookie session | — | `{ oldPassword, newPassword }` | `200 { msg: "Success! Password Updated." }` |
| POST | `/resend-verification` | public | 3/hour | `{ email }` | `200 { msg }` |
| POST | `/forgot-password` | public | 5/hour | `{ email }` | `200 { msg }` — always this generic message, whether or not the account exists (no user enumeration) |
| POST | `/reset-password` | public | 5/hour | `{ email, otp, newPassword }` | `200 { msg }` — invalidates every one of the user's sessions, on every device |
| DELETE | `/me` | cookie session | — | `{ password }` | `200 { msg: "Account deleted" }` — cascades per the existing `User` model hook (employer's jobs / talent's applications), clears cookies |

**Register body** — required for every role: `name, email, password, lastName, location: { country, city }, role: 'talent' | 'employer', phone`. If `role === 'employer'`, additionally required: `companyName, companySize, industry`.

**Password policy (register, reset-password, updateUserPassword):** minimum 8 characters, at least one letter and one digit. Also checked against the "Have I Been Pwned" breached-password list server-side (fails open — a breach-check outage never blocks the request) — surface its `400` message ("This password has appeared in a data breach…") like any other validation error.

**OTP codes (verify-Email, reset-password):** 6 digits, 10-minute expiry, max 5 wrong attempts before the code is burned and the user must request a new one (`resend-verification` / `forgot-password` again) — surface the "Too many incorrect attempts" `401` distinctly from a plain wrong-code `401` if you want to auto-prompt a resend.

**Account lockout:** after 5 wrong passwords on `/login`, the account locks for 15 minutes (independent of the existing per-IP rate limiter) — `401` message includes the remaining minutes; surface it as-is.

**Errors to surface:**
- `400` — missing/invalid fields, "Email already exists", employer missing company fields, breached password.
- `401` — "Invalid Credentials", "Please verify your email" (login before verification), account locked (with remaining time), invalid/expired/attempt-exhausted OTP, invalid/expired/reused refresh token.

**Pages using these:** `/register`, `/login`, `/verify-email` (now a 6-digit code form, not an auto-verifying link), `/forgot-password`, `/reset-password` (now includes an `otp` field), `(dashboard)/settings` (account section — name/email via `updateUser`, password via `updateUserPassword`; Danger Zone — `DELETE /me`), global auth provider (`showCurrentUser` on app load, `refresh-token` on 401, `logout` everywhere).

## 3. Jobs (`/api/v1/jobs`) — blanket `authenticateUser` in `app.js`, then per-route role check

### Employer-facing (role: `employer`)

| Method | Path | Body / Query | Success response |
|---|---|---|---|
| POST | `/` | `{ title, company, jobType, jobLocation: { country, city }, description, position?, applicationDeadline? }` | `201 { job }` — fires background job-intelligence processing |
| GET | `/` | query: `search, jobStatus (pending\|interview\|declined\|all), jobType (full-time\|part-time\|internship\|all), sort (newest\|oldest\|a-z\|z-a), page, limit` | `200 { totalJobs, numOfPages, currentPage, jobs: Job[] }` — own jobs only |
| GET | `/:id` | — | `200 { job }` |
| PATCH | `/:id` | any subset of create fields + `jobStatus` | `200 { msg, job }` — changing `description` re-triggers job-intelligence processing |
| DELETE | `/:id` | — | `200 { msg: "job deleted Successfully" }` — cascades to that job's applications + JobProfile |
| PATCH | `/:jobId/close` | — | `200 { msg: "Job closed for applications" }` |

### Talent-facing (role: `talent`)

| Method | Path | Body / Query | Success response |
|---|---|---|---|
| GET | `/search` | query: `search, jobType, country, sort, page, limit` | `200 { totalJobs, numOfPages, currentPage, jobs: Job[] }` — open, non-expired jobs only, plain regex |
| GET | `/search/semantic` | query: `q` (required, 2–500 chars), `workMode (remote\|hybrid\|onsite\|all)`, `jobType`, `threshold` (0–1), `page`, `limit` (max 50), `country` | `200 { totalJobs, numOfPages, currentPage, jobs: Job[] }` — embedding cosine-similarity ranked |
| GET | `/:jobId/match` | — | `200 { match: MatchResult }` — see §6 |
| POST | `/applyForJob/:id` | **multipart/form-data**: `cv` (file, required), `coverLetter?`, `portfolio?`, `linkedInProfile?`, `skills[]?`, `experienceLevel?`, `availability?`, `locationPreferences?`, `references[]?` | `201 { msg, application: JobApplication }` — fires background resume processing |

**Job object shape:**
```json
{
  "_id": "string",
  "company": "string",
  "title": "string",
  "position": "string",
  "jobStatus": "pending" | "interview" | "declined",
  "jobType": "full-time" | "part-time" | "internship",
  "jobLocation": { "country": "string", "city": "string" },
  "description": "string",
  "applicationDeadline": "datetime | null",
  "isClosed": "boolean",
  "createdBy": "string (employer userId)",
  "requiredSkills": "string[]",
  "preferredSkills": "string[]",
  "requiredExperience": "number | undefined",
  "workMode": "remote | hybrid | onsite | undefined",
  "salaryRange": { "min": "number", "max": "number", "currency": "string" } | undefined,
  "intelligenceProcessingStatus": "pending | processing | completed | failed",
  "createdAt": "datetime", "updatedAt": "datetime"
}
```
`requiredSkills`, `preferredSkills`, `requiredExperience`, `workMode`, `salaryRange` are optional — jobs created without them simply omit or default them. The frontend job-creation form should still let an employer supply them (they materially improve match quality) but must not require them since the backend doesn't.

**Errors to surface:** `400` (validation, past deadline, job closed, already applied, already rejected), `403` (wrong role, or PATCH/DELETE on a job you don't own — note `updateJob`/`getAllJobs` scope by `createdBy` so a non-owner gets `404`, not `403`), `404` (job not found).

**File upload constraints (`applyForJob`):** field name must be exactly `cv`; MIME `application/pdf | application/msword | application/vnd.openxmlformats-officedocument.wordprocessingml.document`; extensions `.pdf .doc .docx`; max 5MB. Show these constraints in the upload UI before the user picks a file, and surface the exact backend message ("CV file must be smaller than 5MB", "Only PDF, DOC, and DOCX files are allowed for CV upload") on rejection.

**Pages using these:** employer `(dashboard)/jobs` (list/create/edit/close/delete), employer `jobs/[id]`; talent `(dashboard)/jobs` (search — plain + semantic tabs), talent `jobs/[id]` (detail + apply + match score).

## 4. Job Matching — talent only

Two endpoints: `GET /api/v1/jobs/:jobId/match` (single job) and `GET /api/v1/candidate-profile/matches` (batched, see §11) — both never accept a candidate id from the request, always the authenticated caller's own profile.

```json
{
  "match": {
    "matchScore": 87,
    "componentScores": { "...matcher-specific keys, shape not fixed by contract..." },
    "matchedSkills": ["React", "TypeScript"],
    "missingRequiredSkills": ["Kubernetes"],
    "matchingAlgorithmVersion": "v1",
    "candidateProfileStatus": "available | not_found | pending | processing | completed | failed",
    "jobProfileStatus": "not_found | pending | processing | completed | failed"
  }
}
```
`componentScores` keys come from whichever matchers ran (`services/matching/matchers/*.js`: domain, experience, preference, preferredSkills, requiredSkills, semantic, seniority) — treat as a loosely-typed `Record<string, number>` on the frontend, not a fixed interface, and render defensively (only show a component row if the key is present).

The `/matches` page calls `GET /api/v1/candidate-profile/matches` directly (see §11) — a real server-side ranked, paginated call, not a client-side fan-out. The single-job endpoint (`GET /jobs/:jobId/match`) is still used on the job detail page and for the dashboard's small "recent match scores" widget (a handful of specific job ids, not a list).

`candidateProfileStatus: "not_found"` means the talent has never had a resume processed and has no hand-edited profile either — the UI must handle this as an explicit empty/prompt state ("Apply to a job or fill in your profile to get AI match scores"), not an error.

## 5. Job Applications (`/api/v1/applications`) — blanket `authenticateUser`

| Method | Path | Auth role | Body | Success response |
|---|---|---|---|---|
| GET | `/my` | talent | — | `200 { TotalSubmittedApplications, ActiveApplications, applications: JobApplication[] }` (job populated) |
| GET | `/job/:jobId` | employer (owner) | — | `200 { applications: (JobApplication & { match })[] }` (talent populated: name/email/phone/profileImage) |
| PATCH | `/:jobId/:applicantId/status` | employer (owner) | `{ status }` — one of `pending, under review, shortlisted, interview, rejected` | `200 { message, status }` |
| PATCH | `/:id/withdraw` | talent (owner) | — | `200 { msg }` — only while status is `pending`/`under review` |
| GET | `/:id/cv` | applicant OR owning employer (checked in controller, not by role) | — | binary file stream (`application/pdf` etc.) |

**JobApplication object shape:**
```json
{
  "_id": "string",
  "job": "string | Job (populated on /my and employer views)",
  "talent": "string | { name, email, phone, profileImage } (populated on employer views)",
  "status": "pending | under review | shortlisted | interview | rejected | withdrawn",
  "Jobtitle": "string",
  "cv": "string (internal storage path — never render directly, always fetch via GET /:id/cv)",
  "coverLetter": "string",
  "portfolio": "string | null",
  "linkedInProfile": "string",
  "skills": "string[]",
  "experienceLevel": "beginner | intermediate | expert",
  "availability": "string",
  "locationPreferences": "string",
  "references": "string[]",
  "appliedAt": "datetime",
  "resumeProcessingStatus": "pending | processing | completed | failed",
  "resumeProcessingError": "string | undefined",
  "createdAt": "datetime", "updatedAt": "datetime"
}
```

Statuses actually supported: **pending, under review, shortlisted, interview, rejected, withdrawn** (`withdrawn` is talent-set only, via the withdraw endpoint — it is not in `updateApplicationStatus`'s allowed set, so an employer can never set it back). Build the Kanban/status board around exactly these six columns — no `screening`/`offer`/`technical interview` distinct statuses exist in this backend.

Status transitions are backend-enforced: withdraw only works from `pending`/`under review`; once `rejected`, `interview`, or `shortlisted`, the applicant cannot withdraw, and a withdrawn application can never be moved by the employer. Reflect this by disabling the corresponding UI actions rather than only catching the resulting `400`.

Drag-and-drop Kanban is safe to implement for the **employer** status board (`PATCH /:jobId/:applicantId/status` supports arbitrary reordering among its 5 non-withdrawn statuses) but not for the **talent** application view, which only ever has one mutating action (withdraw).

**CV download:** never link a CV path directly (it's an internal disk path, not a public URL, and isn't served statically by design). Always request `GET /api/v1/applications/:id/cv` with credentials and let the browser handle the returned file (e.g. open in new tab via a blob URL, or a direct navigation for a same-origin-cookied request).

**Pages using these:** talent `(dashboard)/applications` (table view, withdraw action); employer `(dashboard)/applications` and `jobs/[id]` applicant list (table + Kanban, status update, CV download).

## 6. Talents (`/api/v1/talents`) — employer only, blanket `authenticateUser` + `authorizePermissions('employer')`

| Method | Path | Query | Success response |
|---|---|---|---|
| GET | `/` | `page, limit` | `200 { totalApplications, numOfPages, currentPage, applications: JobApplication[] }` — every applicant across all of the caller's jobs (talent + job populated) |
| GET | `/export-applications` | — | `200` CSV file (`text/csv`, `Content-Disposition: attachment`), capped at 5000 rows, 10/hour limit |
| GET | `/:talentId` | — | `200 { talent: JobApplication[] }` — 404s if that person never applied to one of the caller's jobs |

This is the employer's **candidate pool** view, distinct from the per-job applicant list in §5 — same underlying `JobApplication` documents, aggregated across all of the employer's jobs instead of scoped to one.

**Pages using these:** employer `(dashboard)/dashboard` (talent pool summary), a dedicated employer "Talent Pool" view if built, CSV export action from that view.

## 7. Organizations (`/api/v1/organization`) — auth applied per-route, not at router level

| Method | Path | Auth | Role | Body / Notes | Success response |
|---|---|---|---|---|---|
| POST | `/` | cookie | employer | see below; max 4 orgs/user; 10/hour limit | `201 { msg, newOrganization }` |
| GET | `/` | cookie | employer | — | `200 { organizationListing: Organization[], OrganizationCount }` — own orgs only |
| PATCH | `/:id` | cookie | employer (owner) | partial update | `200 { msg, organization }` |
| DELETE | `/:id` | cookie | employer (owner) | — | `200 { msg }` |
| POST | `/:id/follow` | cookie | talent | — | `200 { message: "Now following organization" | "Already following" }` (idempotent) |
| GET | `/:id/followers` | cookie | employer (owner) | management view | `200 { followers: [{ user, followedAt }] }` |
| GET | `/:id/is-following` | cookie | talent | — | `200 { isFollowing: boolean }` |
| GET | `/public` | none | — | — | `200 { TotalOrganizations, allOrganizations: Organization[] }` |
| GET | `/public/:id` | none | — | — | `200 { organization }` |
| GET | `/public-organizations/:id/followers/count` | none | — | — | `200 { followerCount: number }` |

**Create body required fields:** `name, description, industry, companySize (enum), headquarters: { city, country }, about, hiringContactEmail, emailDomain`. Optional: `website, phone, mission, culture, foundedYear, organizationType (enum), careersPage, socialLinks: { linkedin, twitter, facebook, glassdoor }, locations[], officePhotos[], coverImage, introVideo, awards[], logo`. Note the request shape (`headquarters: {city,country}` + `about`) differs from the stored/returned shape (`hqLocation` string, no `about` field persisted as such) — the controller derives `hqLocation` from `headquarters` server-side; treat organization **create/update** forms and organization **display** as two different shapes on the frontend, matching the actual request vs. response schemas above, not a single shared type.

**Pages using these:** employer `(dashboard)/organization` (create/manage own orgs, followers list), a public organization profile page (`/organizations/[id]`, unauthenticated-friendly) with a follow button shown only to logged-in talents, talent-side organization directory/search if built from `/public`.

## 8. Error handling (applies to every endpoint)

Every error response has the same shape from `errorHandlerMiddleware`:
```json
{ "msg": "human-readable message", "requestId": "uuid" }
```
There is no machine-readable error `code` field — branch UI behavior on HTTP status, and always show `msg` as-is (it's already written to be user-facing) rather than a generic fallback, except for `500`s where a generic "Something went wrong, please try again" is safer than surfacing a raw server message.

| Status | When | Frontend handling |
|---|---|---|
| 400 | Validation errors, business-rule violations (already applied, job closed, past deadline, max orgs reached, etc.) | Show `msg` inline on the form/action, don't redirect |
| 401 | Missing/invalid/expired access token; wrong credentials; unverified email | Attempt one silent `refresh-token` + retry; if that also 401s, clear client auth state and redirect to `/login` |
| 403 | Wrong role for the route; not the resource owner | Show a permission-denied state, don't retry |
| 404 | Resource not found (job, application, organization, talent-not-applied) | Render page-level or list-level empty/not-found state |
| 409 | Not used by this backend (email conflict is actually a `400`, not `409`) | N/A — don't build a distinct 409 branch |
| 429 | Rate limiter tripped (see per-route limits above) | Show the limiter's own `msg` (e.g. "Too many login attempts. Try again in 1 minute.") and disable the action briefly |
| 500 | Unhandled server error | Generic error state + retry action; log `requestId` for support if surfaced |

## 9. Fire-and-forget AI pipelines — no polling endpoint

`POST /jobs` / `PATCH /jobs/:id` (description changed), `POST /jobs/applyForJob/:id`, and `POST /candidate-profile/resume` trigger background AI processing that the HTTP response never waits on. There is **no dedicated status/polling endpoint** — the only way to observe progress is re-fetching the parent resource and reading:
- `Job.intelligenceProcessingStatus` (job itself) / `jobProfileStatus` (via either match endpoint)
- `JobApplication.resumeProcessingStatus` (via `/applications/my` or the employer's `/applications/job/:jobId`) / `candidateProfileStatus` (via either match endpoint)
- `CandidateProfile.processingStatus`/`processingError` (via `GET /candidate-profile`) — same status enum, now also settable by a standalone resume upload, not just a job application's

Frontend implication: after creating/editing a job or submitting an application, show a "processing" badge derived from these status fields and let TanStack Query's `refetchInterval` (short-lived, e.g. poll every 4–5s only while status is `pending`/`processing`, then stop) pick up the transition to `completed`/`failed` — do not fabricate a progress bar with fake intermediate steps ("extracting text… analyzing…") since the backend exposes no such granularity.

## 10. Environment / configuration

- Dev backend: `http://localhost:4000`, dev frontend: `http://localhost:3000` (must match `CLIENT_URL` in `server/.env` for CORS + cookie origin + email links).
- Frontend env var: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000` in dev) — single source of truth for the API client base URL, never hardcode `localhost:4000` elsewhere.
- CORS on the backend is already configured for `credentials: true` and the exact `CLIENT_URL` origin — no frontend-side workaround needed as long as `NEXT_PUBLIC_API_URL` points at a server whose `CLIENT_URL` matches where the frontend is actually served from.

## 11. Candidate Profile (`/api/v1/candidate-profile`) — talent only, blanket `authenticateUser` in `app.js`

| Method | Path | Body / Query | Success response |
|---|---|---|---|
| GET | `/` | — | `200 { profile: CandidateProfile }` — `404` if the caller has no profile yet |
| PATCH | `/` | any subset of `skills, yearsOfExperience, education, certifications, domains, preferredRoles, preferredLocations, workModePreference` | `200 { msg, profile }` — upserts (creates on first edit), increments `profileVersion`; every other field (`resumeText`, `resumeMetadata`, `processingStatus`, `embedding`, etc.) is silently ignored if sent |
| POST | `/resume` | **multipart/form-data**: `cv` (file, required) — same constraints as job-application upload (PDF/DOC/DOCX, 5MB max), 20/hour limit | `202 { msg }` — fires background resume processing, independent of any job application |
| GET | `/matches` | query: `page, limit (max 50), minScore (0-100)` | `200 { totalJobs, numOfPages, currentPage, candidateProfileStatus, matches: [{ job, matchScore, componentScores, matchedSkills, missingRequiredSkills, matchingAlgorithmVersion, jobProfileStatus }] }` — every open, non-expired job (capped at 500) ranked by match score, best first |

**CandidateProfile object shape:**
```json
{
  "_id": "string",
  "user": "string",
  "skills": "string[]",
  "yearsOfExperience": "number | undefined",
  "education": [{ "degree": "string?", "field": "string?", "institution": "string?", "graduationYear": "number?" }],
  "certifications": "string[]",
  "domains": "string[]",
  "preferredRoles": "string[]",
  "preferredLocations": "string[]",
  "workModePreference": "remote | hybrid | onsite | any",
  "resumeMetadata": {
    "fileName": "string (internal storage path, not for display)",
    "originalFileName": "string | undefined (the actual uploaded filename, for display)",
    "extractedAt": "datetime"
  },
  "processingStatus": "pending | processing | completed | failed",
  "processingError": "string | undefined",
  "profileVersion": "number",
  "createdAt": "datetime", "updatedAt": "datetime"
}
```

**Errors to surface:** `400` (empty PATCH body, no file on resume upload, invalid file type/size), `401`, `403` (wrong role), `404` (GET with no profile yet — render as an empty/prompt state, not an error banner).

## 12. Two-Factor Authentication, Sessions, and Google Sign-In (`/api/v1/auth/*`)

Added 2026-09-07 as part of the modern-auth backend pass. **No frontend UI exists for any of these yet** — build against these contracts when that work is picked up.

### 2FA (TOTP, authenticator-app based)

| Method | Path | Auth | Rate limit | Body | Success response |
|---|---|---|---|---|---|
| POST | `/2fa/setup` | cookie session | — | — | `200 { qrCodeDataUrl, secret }` — render the QR code (a `data:image/png;base64,...` URL, drop it straight into an `<img src>`) for scanning, and show `secret` as a manual-entry fallback. Does **not** enable 2FA yet. |
| POST | `/2fa/verify-setup` | cookie session | 5/15min | `{ token }` — 6-digit code from the authenticator app | `200 { msg, backupCodes: string[] }` — 2FA is now enabled. `backupCodes` (8 codes, format `XXXXX-XXXXX`) are shown **exactly once** — the UI must force the user to save them (no "skip" without acknowledgment) since they can never be fetched again. |
| POST | `/2fa/disable` | cookie session | — | `{ password }` | `200 { msg }` — re-confirms identity via password; also signs out every other device, keeping the current one logged in |
| POST | `/2fa/login` | public | 5/15min | `{ tempToken, token }` — `tempToken` from the `requiresTwoFactor` login response; `token` is a 6-digit TOTP code **or** an unused backup code | `200 { tokenUser }` + sets cookies (completes the login) |

`tempToken` expires after 5 minutes — if `/2fa/login` 401s with an expired/invalid token, send the user back to `/login` to start over rather than retrying the same tempToken.

### Session / device management

| Method | Path | Auth | Body | Success response |
|---|---|---|---|---|
| GET | `/sessions` | cookie session | — | `200 { sessions: [{ id, ip, userAgent, createdAt, updatedAt, isCurrent }] }` — every device the caller is currently logged in on |
| DELETE | `/sessions/:id` | cookie session | — | `200 { msg }` — signs out that one device; `404` if the id doesn't belong to the caller |
| DELETE | `/sessions` | cookie session | — | `200 { msg }` — "log out all other devices"; the session making the request is left logged in |

A natural settings-page feature: list `sessions`, render `userAgent`/`ip`/`updatedAt` (last active) per row, highlight the one where `isCurrent` is true (and don't offer a revoke button for it — that's what regular logout is for), plus a "log out everywhere else" button wired to `DELETE /sessions`.

### Google Sign-In (ID-token flow — no redirect/callback URL)

Frontend integration for this specifically requires Google Identity Services (`https://accounts.google.com/gsi/client`) configured with a real `GOOGLE_CLIENT_ID` — inert until the backend `.env` has one (see `server/.env.example`). The frontend renders Google's own "Sign in with Google" button/prompt, receives an ID token client-side, and POSTs just that token here — the backend never redirects anywhere.

| Method | Path | Auth | Rate limit | Body | Success response |
|---|---|---|---|---|---|
| POST | `/google` | public | 5/min | `{ idToken }` | One of three shapes: (1) `{ tokenUser }` + cookies — known/linked account, logged in directly; (2) `{ requiresTwoFactor: true, tempToken }` — known account with 2FA enabled, same completion flow as password login via `/2fa/login`; (3) `{ needsOnboarding: true, pendingToken, profile: { email, name, lastName } }` — brand-new Google identity, not enough info yet to create the account |
| POST | `/google/complete` | public | 5/min | `{ pendingToken, role, phone, location: { country, city }, companyName?, companySize?, industry? }` (company fields required when `role === 'employer'`) | `201 { tokenUser }` + cookies — creates the account (pre-verified, no local password) and logs in |

An existing password-login account is auto-linked to a Google identity the first time someone signs in with Google using the *same, Google-verified* email — no separate "link your account" step needed on the frontend. `pendingToken` expires after 15 minutes, same handling as `tempToken` above (send back to the start of the Google sign-up flow on expiry).

**Pages using these:** talent `(dashboard)/profile` (view/edit + resume upload widget), talent `(dashboard)/matches` (batched ranking).
