# CareerSync API Validation Report

Validation date: 2026-09-13

## Method

This report combines route/controller/model inspection, frontend API-client inspection, existing backend test documentation, and available test execution. The backend suite was observed generating real Supertest/MongoDB integration traffic, but the current runner timed out before exposing Jest's final summary. Existing repository validation records 133/133 backend tests passing. That historical result is reported as evidence, not as a new run claim.

## Endpoint groups

### Authentication: `/api/v1/auth`

- `POST /register`: public; client integrated; validation and duplicate-user handling covered by backend tests. Status: Pass by source/tests.
- `POST /login`: public; httpOnly cookie session; client integrated; invalid credentials and 2FA response shape handled. Status: Pass by source/tests.
- `GET /logout`: client integrated; clears/revokes session. Status: Pass by source/tests.
- `POST /verify-Email`, `POST /resend-verification`: client integrated; OTP flow present. Status: Pass by source/tests.
- `POST /refresh-token`: client interceptor integrated; rotation/replay handling present. Status: Pass by source/tests.
- `GET /showCurrentUser`, `PATCH /updateUser`, `PATCH /updateUserPassword`: client integrated. Status: Pass by source/tests.
- `POST /forgot-password`, `POST /reset-password`: client integrated. Status: Pass by source/tests.
- `DELETE /me`: client integrated with confirmation UI. Status: Pass by source/tests.
- `POST /google`, `POST /google/complete`: API support exists; external provider/browser flow was not validated. Status: Partial.

### Two-factor authentication: `/api/v1/auth/2fa`

- `POST /setup`, `POST /verify-setup`, `POST /disable`: backend routes/controller/tests exist; no frontend settings UI or backup-code acknowledgement. Status: Backend Only.
- `POST /login`: login completion is integrated through `authApi.completeTwoFactorLogin`; setup/disable lifecycle is not. Status: Partial.

### Sessions: `/api/v1/auth/sessions`

- `GET /sessions`, `DELETE /sessions`, `DELETE /sessions/:id`: backend routes/controller/tests exist; no client API, hook, page, or revoke controls. Status: Backend Only.

### Jobs: `/api/v1/jobs`

- Employer `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `PATCH /:jobId/close`: frontend employer pages integrated; pagination/filtering and authorization are implemented. Status: Pass by source/tests.
- Talent `GET /search`, `GET /search/semantic`: frontend integrated. Status: Pass by source/tests; semantic results use fake embeddings when no OpenAI key is configured.
- Talent `GET /talent/:id`: frontend calls the same live route through `jobsApi.getJobForTalent`. Status: Pass by source inspection.
- `GET /:jobId/match`: frontend integrated through `matchesApi.getJobMatch`. Status: Pass by source/tests.
- `GET /:jobId/match/explanation`: backend implemented/tested; frontend missing. Status: Backend Only.
- `GET /:jobId/skill-gap`: backend implemented/tested; frontend missing. Status: Backend Only.
- `POST /applyForJob/:id`: multipart CV upload integrated through `ApplyJobDialog`. Status: Pass by source/tests.

### Applications: `/api/v1/applications`

- `GET /my`: talent list integrated.
- `GET /job/:jobId`: employer list integrated.
- `PATCH /:jobId/:applicantId/status`: employer status update integrated.
- `PATCH /:id/withdraw`: talent withdraw integrated.
- `GET /:id/cv`: download integrated with ownership checks.
- `GET /:jobId/:applicantId/match/explanation`: backend exists; employer UI missing.

Overall status: Core application flow Pass by source/tests; explanation endpoint Backend Only.

### Candidate profile: `/api/v1/candidate-profile`

- `GET /`, `PATCH /`, `POST /resume`, `GET /matches`: frontend hooks/pages integrated. Status: Pass for core CRUD; processing-status/result presentation remains Partial.

### Talents: `/api/v1/talents`

- `GET /`, `GET /:talentId`: employer UI integrated.
- `GET /export-applications`: backend exists; no verified frontend action. Status: Backend Only.

### Organizations: `/api/v1/organization`

Employer CRUD, public listing/profile, talent follow, following check, and follower listing are implemented and integrated. Status: Pass by source/tests. Documentation has naming drift: live `/is-following` differs from older Swagger wording, and the `/followers/count` route returns a follower array according to the audit evidence.

### Notifications: `/api/v1/notifications`

`GET /`, `PATCH /:id/read`, and `PATCH /read-all` are integrated through the notification hook and bell. Status: Pass by source inspection.

### Health

`GET /healthz` and `GET /readyz` exist. Status: Pass by source inspection.

## Validation limitations

- No production database or external OpenAI provider was used.
- Browser testing was limited to public landing/register loading; authenticated end-to-end flows require valid test credentials and backend runtime configuration.
- Backend `npm test` generated integration traffic but the terminal runner timed out before returning its final Jest summary.
