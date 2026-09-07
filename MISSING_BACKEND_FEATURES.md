# Missing Backend Features

Gaps between what the frontend brief asked for and what `server/` actually implements, found while writing `FRONTEND_API_INTEGRATION.md`. Items 1–5 have since been implemented (backend + frontend wiring); 6–8 remain open. The frontend never fakes an unimplemented feature — each open gap below is either omitted from the UI or reshaped to what the real API supports.

---

## Resolved

### 1. CandidateProfile CRUD — ✅ implemented

`GET /api/v1/candidate-profile` (404 if none) and `PATCH /api/v1/candidate-profile` (upserts, whitelists `skills, yearsOfExperience, education, certifications, domains, preferredRoles, preferredLocations, workModePreference`) — `controllers/candidateProfileController.js`, `routes/candidateProfileRoutes.js`. Frontend: `/profile` page (`app/(dashboard)/profile/page.tsx`), `hooks/use-candidate-profile.ts`. Tests: `tests/candidateProfileApi.test.js`.

### 2. Standalone resume upload — ✅ implemented

`POST /api/v1/candidate-profile/resume` (multipart `cv`, same constraints as job-application upload, 20/hour limit) — reuses the existing `uploadCV` middleware unchanged, and a new `processResumeForUser`/`triggerResumeProcessingForUser` pair in `services/resume/resumeProcessingService.js` that claims via the `CandidateProfile` document itself (no `JobApplication` involved). No resume "score" was invented — still no such concept in `services/matching/` — the profile page just surfaces `processingStatus`/`processingError` and the extracted fields. Frontend: `ResumeUploadCard` on `/profile`.

### 3. Batched `/matches` endpoint — ✅ implemented

`GET /api/v1/candidate-profile/matches` (`page`, `limit`, `minScore` query params) — new `calculateMatchesForCandidate` in `services/matching/matchingService.js`, reusing the existing pure `calculateMatch` function (no duplicated matching logic). Scores every open, non-expired job (capped at `MAX_MATCHING_CANDIDATE_JOBS = 500`, same bounding pattern as `talentController`'s CSV export cap) against one fetch of the candidate's profile, ranks in memory, paginates. The frontend's `/matches` page now calls this directly instead of the old search+lazy-fetch workaround.

### 4. Forgot/reset password — ✅ implemented

`POST /api/v1/auth/forgot-password` (`{email}`, always 200 with a generic message — deliberately stronger than `resendVerificationToken`'s existing user-enumerating behavior, since this is more sensitive) and `POST /api/v1/auth/reset-password` (`{email, resetToken, newPassword}`, timing-safe token comparison, 10-minute expiry, invalidates the user's existing refresh session on success). New `User.passwordResetToken`/`passwordResetTokenExpires` fields, new `utils/sendPasswordResetEmail.js`. Frontend: `/forgot-password`, `/reset-password` pages; login page links to `/forgot-password`. Tests: `tests/passwordReset.test.js`.

**Bug fixed along the way:** `utils/sendVerificationEmail.js`'s email link pointed at `/user/verify-email?token=...`, which never matched the real route (`/api/v1/auth/verify-Email`, param `verificationToken`) or the frontend's actual page (`/verify-email`). The verification email's link had always been broken; it's now `/verify-email?email=...&verificationToken=...`, matching both.

### 5. Account deletion — ✅ implemented

`DELETE /api/v1/auth/me` (`{password}`, re-verifies the password, then `User.findOneAndDelete` — required instead of `deleteOne` to fire the existing cascade hook that cleans up an employer's jobs or a talent's applications — then invalidates the refresh session and clears cookies). Frontend: Settings → Danger Zone.

**Small additive bonus while touching this area:** `CandidateProfile.resumeMetadata.fileName` was always the internal CV storage path, not a human-readable name (pre-existing, unrelated to this task). Added `resumeMetadata.originalFileName` (and `JobApplication.cvOriginalName` to source it from the job-application upload flow too) so the frontend can display an actual filename. Purely additive — neither existing field's behavior changed.

---

## Still open

### 6. No notification preferences

**Feature:** The brief's Settings → Notifications section.

**Why it's still open:** No notification system (email digests, in-app alerts, application-status-change pings) exists anywhere in the backend — `nodemailer`/`mailgen` are wired only for transactional auth emails (verification, password reset), not for any user-configurable notification. Storing a `notificationPreferences` toggle with nothing behind it to actually send anything was judged low-value on its own, so it was deliberately left out of this pass.

**Suggested endpoint:** a `notificationPreferences` sub-document on `User` plus `GET/PATCH /api/v1/auth/notification-preferences`, and, separately, an actual notification-sending system to make the preferences meaningful.

### 7. Organization "analytics" was stubbed then removed

**Feature:** Any employer-facing analytics (applicants per job over time, conversion rate, follower growth) implied by "AI Career Insights" / dashboard-analytics expectations for the employer side.

**Why it's still open:** `organizationController.js` explicitly documents that an analytics endpoint was stubbed and then deliberately removed as dead code (never wired into a route, never finished). This is the biggest and least-specified of the original gaps, so it was deliberately deferred rather than guessed at.

**Current workaround:** the employer dashboard's "insights" are limited to counts/aggregates the frontend derives client-side from already-fetched lists (job count by status, applications by status, follower count via the existing public count endpoint) — never a fabricated trend chart.

**Suggested endpoint:** `GET /api/v1/organization/:id/analytics` returning time-bucketed applicant counts, status funnel counts, and follower growth.

### 8. Cross-origin cookie behavior in production

**Not a missing feature so much as a deployment risk:** auth cookies (`server/utils/jwt.js`) are set with no explicit `SameSite` (defaults to `Lax`) and `secure: NODE_ENV === 'production'`. This works in local dev because `localhost:3000`/`localhost:4000` are same-site. If the deployed frontend and backend end up on different registrable domains (e.g. `app.careersync.com` and `api.careersync-backend.io`), `SameSite=Lax` cookies will **not** be sent on the frontend's cross-site `fetch` calls, breaking auth entirely in production despite working in dev.

**Recommendation (not a frontend fix):** either serve frontend and backend from the same registrable domain (e.g. `careersync.com` + `api.careersync.com`, which is same-site) or have the backend set `SameSite=None; Secure` explicitly when cross-domain deployment is unavoidable. Flagging here so it isn't discovered for the first time during a production deploy.

---

## Unrelated pre-existing issue noticed (not fixed — out of scope)

`tests/organizations.test.js` — "returns the follower count for a public organization" — asserts `res.body.organization.followers`, but `getPublicFollowerCount` (`controllers/organizationController.js`) actually responds `{ followerCount: number }`. This test was already failing before this work started (confirmed via `git diff` showing no changes to either file this session) and is unrelated to items 1–5 above. Left as-is since organization code was explicitly out of scope for this pass; worth a one-line test fix (`res.body.followerCount`) whenever organization work is picked up.
