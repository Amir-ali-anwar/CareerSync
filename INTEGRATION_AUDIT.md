# CareerSync Frontend/Backend Integration Audit

Validation date: 2026-09-13

## Request path

The implemented core path is:

`Next.js page/component -> TanStack Query hook -> client API module -> Axios client -> /api/v1 route -> middleware/controller -> service/model -> response -> query cache/UI`

## Integration findings

### API client and authentication

- `client/src/lib/api/client.ts` centralizes the API base URL, credentials, error normalization, and refresh behavior.
- Auth uses cookies rather than exposing access tokens in browser JavaScript.
- The client has a 401 refresh/retry path and tests for Axios error normalization/refresh behavior.
- Backend auth routes, cookie handling, password hashing, rotation, replay handling, and protected route middleware are implemented and covered by the existing backend test suite.
- Missing client auth integration: 2FA setup/verify/disable and sessions API. Login completion for an already-enabled 2FA account is present.

### Jobs and search

- Employer job CRUD calls `/jobs` and `/jobs/:id` routes consistent with the server route file.
- Talent detail calls `/jobs/talent/:id`, matching the explicit server talent route. This is not an API mismatch.
- Plain search calls `/jobs/search`; semantic search calls `/jobs/search/semantic`.
- Application upload calls `/jobs/applyForJob/:id` with multipart field handling in the existing dialog.
- Match score calls `/jobs/:jobId/match`.
- Missing client integration: `/jobs/:jobId/match/explanation` and `/jobs/:jobId/skill-gap`.

### Applications and profiles

- Candidate profile GET/PATCH/resume upload/matches methods exist and are used by hooks/pages.
- Talent applications use `/applications/my`; employer applications use `/applications/job/:jobId`.
- Status updates, withdrawals, and CV download methods are integrated.
- Backend processing fields (`resumeProcessingStatus`, `resumeProcessingError`) are not consistently surfaced in the UI.

### Organizations and notifications

- Organization CRUD/public/follow methods are present and connected to UI views.
- Notification list/read/read-all methods are connected to the notification bell/hook.
- The live organization path `/is-following` is used by the client; older Swagger wording differs.
- The endpoint named `/followers/count` reportedly returns an array, which is a contract/documentation concern even if current UI usage is unaffected.

## Backend-only integrations

1. 2FA setup, verification, disable, and backup-code display.
2. Session listing, individual revocation, and revoke-all-others.
3. Talent match explanations.
4. Employer applicant match explanations.
5. Talent skill-gap analysis.
6. Talent CSV export action.

## Processing and provider risks

- Resume and job intelligence are asynchronous/fire-and-forget flows. The API has status/error fields, but the client does not consistently poll or present them.
- With no `OPENAI_API_KEY`, `server/services/ai/index.js` selects the deterministic fake provider. Embeddings and AI-shaped outputs therefore work structurally but are not real model output.
- No evidence of hardcoded secrets was found in source inspection.

## Integration status

Core auth, profile, jobs, applications, organizations, notifications, and match-score flows are integrated by source inspection and existing tests. Advanced backend services are not fully exposed through the frontend. A full authenticated browser-to-database run remains outstanding because a test account and stable backend/browser session were not available in this audit.
