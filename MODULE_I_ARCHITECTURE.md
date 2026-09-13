# Module I Architecture Audit

Validation date: 2026-09-13

## Existing application architecture

`JobApplicationModel` records the candidate, job, submitted CV path/name, application status, application date, timestamps, form metadata, and resume-processing status/error. It does not record an event timeline, recruiter responses, follow-up dates, interview metadata, notes, or AI insight fields. The existing status enum is `pending`, `under review`, `shortlisted`, `interview`, `rejected`, and `withdrawn`.

The talent application endpoint returns the authenticated user's applications with populated jobs. Employer application views additionally include match annotations. There is no application detail route or timeline collection.

## Existing AI and intelligence infrastructure

- CandidateProfile and JobProfile contain normalized skills, experience, domains, certifications, education, processing state, versions, and optional embeddings.
- Matching is deterministic and explainable through the existing matching services, score aggregation, match classification, explanation service, and skill-gap service.
- Embeddings and semantic retrieval are available through the existing AI provider boundary and MongoVectorStore.
- The AI provider defaults to a deterministic fake provider when `OPENAI_API_KEY` is absent; there is no existing Copilot prompt, conversation, LLM output validation, or thread-memory infrastructure.
- Notifications and realtime sockets exist, but no career-insight persistence or analytics event system exists.

## Data sources reused

Module I uses only authenticated user data: CandidateProfile, the user's populated applications and jobs, current match calculations, job profiles where available, processing statuses, application statuses, and real dates. It does not invent timeline events, interview dates, recruiter activity, salaries, or application notes.

## Components to reuse

`matchingService`, `explanationService`, `skillGapService`, existing application/job/profile models, authentication middleware, current API client, TanStack Query hooks, design-system Card/Badge/Button primitives, EmptyState/ErrorState, and existing dashboard/application pages.

## Components to create

- Deterministic application-health and career-insights service.
- Grounded intent classifier and context builder.
- Authenticated Copilot API with structured responses and reference validation.
- Frontend Copilot page with suggested prompts and clickable job/application references.
- Optional dashboard action summary can be added from the same insight response; no separate analytics model is required.

## API changes

Add:

- `GET /api/v1/copilot/insights` for deterministic career health, application priorities, skill-frequency gaps, and recommendations.
- `POST /api/v1/copilot/query` for grounded Copilot questions. The initial implementation answers supported intents deterministically and returns structured references.

No existing application endpoint or status contract changes.

## Database changes

None. There is no timeline persistence to reuse, so the implementation does not fabricate one. Conversation/thread persistence is intentionally deferred; `threadId` is accepted as an optional request field but is not persisted until a real conversation model is justified.

## Frontend changes

Add `/copilot`, a role-protected Copilot navigation item, API methods/hooks, loading/error/empty states, suggested prompts, structured assistant responses, and linked job/application references. Keep the existing application page unchanged except for consuming the same deterministic insight data in a future dashboard action summary.

## AI vs deterministic boundary

Counts, priorities, statuses, dates, match scores, skill frequencies, application health, and references are deterministic. A future LLM layer may paraphrase validated context, but it must not replace the deterministic source of truth or create unsupported entities.
