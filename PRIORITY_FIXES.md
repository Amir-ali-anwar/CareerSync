# CareerSync Priority Fixes

Validation date: 2026-09-13

## P0 — Critical

No confirmed P0 runtime failure from the available evidence.

## P1 — High

### 1. Add complete 2FA management UI

Backend routes and tests exist, but settings has no setup/verify/disable workflow. The most serious gap is backup codes: the verification response returns them once and the frontend currently has no mandatory display/save acknowledgement.

Affected areas: `server/controllers/twoFactorController.js`, `server/routes/twoFactorRoutes.js`, `client/src/lib/api/auth.ts`, `client/src/app/(dashboard)/settings/page.tsx`.

### 2. Make provider mode an explicit deployment decision

Without `OPENAI_API_KEY`, the server selects `fakeProvider`, including deterministic embeddings and AI-shaped outputs. Keep this mode for CI/development, but add production configuration validation or a clearly documented degraded mode.

Affected area: `server/services/ai/index.js`.

### 3. Expose implemented matching intelligence

Add client methods/hooks/UI for match explanations and skill-gap analysis. These backend services are implemented and tested but currently unreachable from the product UI.

Affected areas: `client/src/lib/api/matches.ts`, `client/src/lib/api/jobs.ts`, match/job-detail components.

## P2 — Medium

### 4. Add session/device management

Implement list, revoke-one, and revoke-all-other-sessions UI in Settings using the existing backend routes.

### 5. Surface asynchronous processing status

Show `resumeProcessingStatus`, `resumeProcessingError`, `intelligenceProcessingStatus`, and `intelligenceProcessingError`; poll only while pending/processing and stop after completion/failure.

### 6. Fix Base UI button/link semantics

The public browser load emitted warnings that Button expects a native `<button>` while several landing-page usages render links. Correct the render/nativeButton configuration to preserve link semantics and remove accessibility warnings.

### 7. Expand frontend test coverage

Only API-client tests were identified. Add component/hook/provider tests for authentication, uploads, job detail, match display, settings, and critical mutation states.

## P3 — Low

- Align Swagger comments with live route names.
- Clarify or correct `/followers/count` response naming/shape.
- Tighten optional URL/text field validation.
- Add performance tests for large job lists, concurrent processing, and pagination stress.

## Release gate

Do not call the product fully complete until P1 items are either implemented or explicitly accepted as out-of-scope, and the backend test suite has a captured final result from a non-expiring runner.
