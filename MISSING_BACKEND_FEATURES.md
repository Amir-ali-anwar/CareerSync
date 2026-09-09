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

### 6. Talent-facing single-job fetch by id — ✅ implemented (2026-09-08)

`GET /api/v1/jobs/talent/:id` — returns the job if it's open and not past its deadline, or (so a talent can still review a job they already applied to after it closes) if the requesting talent has an existing `JobApplication` for it; 404 otherwise, same as a not-found job. Previously `GET /jobs/:id` was employer-only (`authorizePermissions('employer')`), so a talent opening a job-detail page via a direct link, bookmark, or page refresh got nothing — the frontend (`hooks/use-jobs.ts`'s `useTalentJobDetail`) could only ever show a job that had already been seeded into the query cache from a `/search` or `/search/semantic` result list in the same session. `useTalentJobDetail` now calls the real endpoint instead of a deliberately-rejecting stub; cache-seeding from search results is kept as a fast path, this is the fallback for a cold cache.

### 7. 2FA had no frontend integration at all — ✅ implemented (2026-09-08)

The backend's TOTP 2FA (`twoFactorController.js`) was fully built and tested, but nothing in `client/src` called `/2fa/setup`, `/2fa/verify-setup`, `/2fa/login`, or `/2fa/disable` — a user with 2FA enabled (e.g. via a direct API call) would hit `POST /auth/login`'s `{requiresTwoFactor, tempToken}` response shape against a frontend that only ever expected `{tokenUser}`, and could not complete login through the actual product at all. The login page now handles both response shapes: a normal login proceeds as before, while `requiresTwoFactor` swaps in a second step (`app/(auth)/login/page.tsx`) that collects a TOTP/backup code and calls the new `POST /auth/2fa/login` wiring (`useCompleteTwoFactorLogin`, `lib/api/auth.ts`). **Still open:** there is still no Settings UI for a user to actually turn 2FA on/off (`setupTwoFactor`/`verifyTwoFactorSetup`/`disableTwoFactor` remain reachable only via direct API calls) — only the login-time verification step was wired, since that was the completely broken path. Enrollment UI is a reasonably-scoped follow-up.

---

## Still open

### 8. No notification preferences — in-app notifications now exist, digests/preferences still don't

**Update:** An in-app, real-time notification system now exists: `models/NotificationModel.js`, `services/notifications/notificationService.js`, `controllers/notificationController.js`, `GET/PATCH /api/v1/notifications*`, pushed live over socket.io (`services/realtime/socket.js`, authenticated via the same `accessToken` cookie as normal requests, one room per userId). Two triggers are wired so far: `application_submitted` (talent applies → notifies the job's employer) and `application_status_changed` (employer changes status → notifies the talent). Frontend: `NotificationBell` in the dashboard header, `hooks/use-notifications.ts` (react-query + a `useNotificationSocket` live listener, 60s poll as a fallback). Tests: `tests/notifications.test.js`.

**Still open:** no email digests, no user-configurable preferences (which event types to receive, email vs in-app), and no `new_match` trigger — matches are computed on-demand (`GET /candidate-profile/matches`), not proactively, so there's no natural "a new match appeared" event without adding a background job to diff previous results. `nodemailer`/`mailgen` remain wired only for transactional auth emails.

**Suggested next step:** a `notificationPreferences` sub-document on `User` plus `GET/PATCH /api/v1/auth/notification-preferences` to gate which of the above actually fire per user; a scheduled job for match-diffing if `new_match` notifications are wanted.

### 9. Organization "analytics" was stubbed then removed

**Feature:** Any employer-facing analytics (applicants per job over time, conversion rate, follower growth) implied by "AI Career Insights" / dashboard-analytics expectations for the employer side.

**Why it's still open:** `organizationController.js` explicitly documents that an analytics endpoint was stubbed and then deliberately removed as dead code (never wired into a route, never finished). This is the biggest and least-specified of the original gaps, so it was deliberately deferred rather than guessed at.

**Current workaround:** the employer dashboard's "insights" are limited to counts/aggregates the frontend derives client-side from already-fetched lists (job count by status, applications by status, follower count via the existing public count endpoint) — never a fabricated trend chart.

**Suggested endpoint:** `GET /api/v1/organization/:id/analytics` returning time-bucketed applicant counts, status funnel counts, and follower growth.

### 10. Cross-origin cookie behavior in production

**Not a missing feature so much as a deployment risk:** auth cookies (`server/utils/jwt.js`) are set with no explicit `SameSite` (defaults to `Lax`) and `secure: NODE_ENV === 'production'`. This works in local dev because `localhost:3000`/`localhost:4000` are same-site. If the deployed frontend and backend end up on different registrable domains (e.g. `app.careersync.com` and `api.careersync-backend.io`), `SameSite=Lax` cookies will **not** be sent on the frontend's cross-site `fetch` calls, breaking auth entirely in production despite working in dev.

**Recommendation (not a frontend fix):** either serve frontend and backend from the same registrable domain (e.g. `careersync.com` + `api.careersync.com`, which is same-site) or have the backend set `SameSite=None; Secure` explicitly when cross-domain deployment is unavoidable. Flagging here so it isn't discovered for the first time during a production deploy.

---

## Previously-noted test bug — fixed 2026-09-08

`tests/organizations.test.js` — "returns the follower count for a public organization" asserted `res.body.organization.followers`, but `getPublicFollowerCount` (`controllers/organizationController.js`) actually responds `{ followerCount: number }`. Fixed the assertion to match the real (correct) response shape.
