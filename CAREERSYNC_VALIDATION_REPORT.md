# CareerSync Validation Report

Validation date: 2026-09-13

## 1. Application health score

These are evidence-weighted audit scores, not runtime telemetry:

| Area | Score | Basis |
|---|---:|---|
| Backend implementation | 90% | Core API, models, security controls, async services, and broad integration tests exist. External-provider and concurrency/performance validation remain limited. |
| Frontend implementation | 78% | Core auth, profile, jobs, applications, organizations, notifications, and matching UI exist. 2FA management, sessions, explanations, skill gaps, and processing-status presentation are missing. |
| Frontend/backend integration | 72% | Core route/client contracts align. Several complete backend endpoints have no client integration, and authenticated browser flows were not fully executed. |
| Overall | 80% | Strong beta foundation; not feature-complete against the implemented backend surface. |

## 2. Features validated

- Registration, email verification, login, logout, refresh, password reset, account deletion, profile/password updates.
- Job creation, listing, editing, deleting, closing, plain search, semantic search, detail, application upload, and match score.
- Candidate profile read/update/resume upload/batched matches.
- Application listing, employer status updates, talent withdrawal, and CV download.
- Organization CRUD, public pages, following, and follower data.
- Notifications and realtime notification wiring.
- Backend resume extraction, job intelligence, embeddings, matching explanation, and skill-gap services by source/tests.
- Security hardening and protected-route behavior by source/tests/docs.

## 3. Complete or near-complete features

Core authentication/account flows, candidate profile CRUD, employer job CRUD, talent search, application lifecycle, organization workflows, notifications, and match-score display are implemented end-to-end in code and covered by existing backend tests. The repository's existing validation docs report 133/133 backend tests passing.

## 4. Partial features

- Resume intelligence: processing exists, but processing status/errors/results are not consistently shown in the frontend.
- Job intelligence: backend extraction and JobProfile persistence exist, but extracted intelligence/status is not consistently exposed in job UI.
- Semantic search and AI outputs: structurally integrated, but default to deterministic fake provider mode without `OPENAI_API_KEY`.
- Kanban: status mutation exists; complete browser drag/drop persistence was not validated in this audit.
- Google OAuth: code exists, but external provider/browser flow was not exercised.
- Talent CSV export: backend exists but no confirmed frontend action.

## 5. Backend-only or broken-parity features

- 2FA setup/verification/disable UI and backup-code acknowledgement.
- Session/device management UI.
- Talent and employer match explanation UI.
- Skill-gap roadmap UI.
- Processing-state and processing-error presentation.

No confirmed core API path break was found in the source cross-check. The `/jobs/talent/:id` client/server route pair is intentional and aligned.

## 6. Mock or deterministic features

When `OPENAI_API_KEY` is absent, `fakeProvider.js` supplies deterministic resume extraction, job intelligence, embeddings, explanations, and skill-gap suggestions. This is explicitly logged by the server and is suitable for development/CI, but must not be presented as real model output in a production readiness claim.

## 7. Backend features missing from frontend

2FA management, session/device management, match explanation details, skill-gap analysis, employer-facing applicant explanations, talent CSV export action, and complete processing-status display.

## 8. Frontend features missing backend support

No clear frontend-only business feature was found in the inspected core surfaces. UI placeholders are form guidance, not submitted data. The main issue is backend capability ahead of frontend parity.

## 9. Critical issues

### P0

- None confirmed from source inspection. Existing hardening documentation indicates prior token, CV access, authorization, rate-limit, and secret-management issues were addressed.

### P1

- 2FA setup has no frontend surface for backup codes. Since codes are returned once, users cannot complete a safe setup/save flow.
- AI provider defaults to fake mode without an OpenAI key. Production must explicitly decide whether deterministic fallback is acceptable.
- Advanced backend intelligence cannot be consumed by users because explanation and skill-gap API methods/UI are absent.

### P2

- Processing status/error fields are not surfaced consistently.
- Frontend component/hook/provider test coverage is effectively absent beyond API-client tests.
- Public landing page emits Base UI native-button accessibility warnings when links are rendered through Button.
- Backend test command timed out in the current runner before exposing its final summary; rerun in a terminal with a longer timeout and captured output before release sign-off.

### P3

- Swagger/live route naming drift.
- Followers count route naming/response-shape ambiguity.
- Optional field validation and API envelope consistency improvements.

## 10. Recommended roadmap

1. Add 2FA settings UI with QR display, verification, non-skippable backup-code acknowledgement, copy/download, and disable confirmation.
2. Add session/device API methods, hooks, settings list, individual revoke, and revoke-all-others.
3. Add match-explanation and skill-gap API methods with detail panels in job detail/matches views.
4. Surface resume/job processing status and failure messages with bounded polling while pending/processing.
5. Fix landing-page Base UI button/link semantics warnings.
6. Add frontend tests for auth provider, API hooks, upload flow, job detail, match panels, and critical settings actions.
7. Run full backend tests with captured final output, then execute authenticated browser smoke tests against a configured local backend and database.

## Validation limitations

The public frontend loaded successfully at `http://localhost:3000`. Authenticated browser flows were not fully run because no test credentials/session were supplied. The backend test process generated real integration requests but the current execution wrapper timed out before its final Jest summary became available. No secrets were printed or inspected.
