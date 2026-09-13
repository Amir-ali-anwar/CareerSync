# Module J Architecture Audit

Validation date: 2026-09-13

This audit inspects the actual repository state before designing the Agentic Career
Workflow Engine. Nothing below is assumed from the module brief; every claim was
verified by reading the corresponding source file.

## 1. Existing capabilities (by area)

| Area | Status | Evidence |
|---|---|---|
| Authentication | Complete | `authController.js`, JWT cookie auth (`middlewares/auth.js`), 2FA, OAuth, sessions, password reset |
| CandidateProfile | Complete | `CandidateProfileModel.js` - skills, experience, education, certifications, domains, preferences, resume text, embedding, processing status/version |
| Resume Intelligence | Complete | `services/resume/resumeProcessingService.js`, `textExtraction.js` - resume → structured `CandidateProfile` via `aiService.extractResumeProfile` |
| Job Intelligence | Complete | `services/job/jobIntelligenceService.js`, `JobProfileModel.js` - job description → normalized title/seniority/skills/domains |
| JobProfile | Complete | `JobProfileModel.js`, versioned, staleness-hashed |
| Skill normalization | Complete | `utils/normalization.js` - alias table, `normalizeSkillKey`, `canonicalSkillName` |
| Embeddings | Complete | `services/embeddings/embeddingService.js`, `embeddingConfig.js`, `mongoVectorStore.js` |
| Vector search | Complete | `MongoVectorStore` (`services/embeddings/mongoVectorStore.js`) - cosine search over stored embeddings |
| Semantic search | Complete | `services/embeddings/semanticJobSearchService.js` (`GET /jobs/search/semantic`); `matchingService.calculateMatchesForCandidate` also uses the candidate's own embedding for retrieval |
| Job matching | Complete | `services/matching/matchingService.js` - deterministic, versioned, weighted multi-dimension scorer (`algorithmVersions.js`, matcher modules) |
| Explainable matching | Complete | `services/matching/explanationService.js`, `matchLevel.js` (Module G) |
| Job recommendations | Complete | `calculateMatchesForCandidate` - ranked, paginated, semantic-retrieval-first with a deterministic fallback |
| Application tracking | Complete | `JobApplicationModel.js`, `jobApplicationController.js` - status enum, CV storage, no event timeline |
| Career insights | Partial | `careerCopilotService.buildCareerInsights` (Module I) - readiness, attention items, skill-gap frequency; no persisted insight history |
| Career Copilot | Complete (deterministic) | `services/career/careerCopilotService.js`, `copilotController.js`, `/copilot` frontend page (Module I) - intent-routed Q&A, **no LLM call**, grounded references only |
| Existing AI services | Complete (provider-abstracted) | `services/ai/aiService.js` wraps `providers/openAiProvider.js` / `providers/fakeProvider.js` behind timeout/retry/shape-validation/logging |
| Existing LLM providers | Complete | OpenAI provider (chat + embeddings, untested against a live key) and a deterministic fake provider (default when `OPENAI_API_KEY` unset) |
| LangGraph / agent infra | **Does not exist** | No agent framework, no graph/state-machine library in `server/package.json`. No existing "agent," "planner," or "tool registry" abstraction anywhere in `server/services/` |
| Queues / background jobs | **Does not exist** | No BullMQ/Redis/queue package. All AI/matching work in this repo runs synchronously inside the request that needs it |
| Logging | Partial | `utils/logger.js` - minimal structured JSON logger (`info/warn/error`), already used by `aiService.js`. No log aggregation/tracing platform |
| Caching | **Does not exist** | No Redis/in-memory cache layer found |
| Tests | Complete, extensive | Jest + `mongodb-memory-server` + supertest; per-module unit tests (`tests/matching/*`, `tests/career/*`) and API tests (`tests/*Api.test.js`) with shared `tests/helpers.js` fixtures |

## 2. Existing services to reuse

- `matchingService.calculateMatch` / `calculateMatchForCandidateAndJob` / `calculateMatchesForCandidate` / `getMatchWithProfiles` - the only scoring engine. Module J must never re-score independently.
- `skillGapService.buildSkillGapAnalysis` - the only skill-gap engine, built directly on a `MatchResult`.
- `careerCopilotService.buildCareerInsights` / `classifyApplicationHealth` - the only application-health/readiness logic. Reused as-is for the Application Agent rather than rebuilt.
- `semanticJobSearchService.semanticJobSearch` and `vectorStore.search` (via `calculateMatchesForCandidate`) - the only semantic retrieval paths.
- `CandidateProfileModel`, `JobsModel`, `JobProfileModel`, `JobApplicationModel` - no new schema fields on any of these.
- `authenticateUser` + `authorizePermissions("talent")` - identical security pattern to every talent-only route, including `/copilot`.
- `utils/logger.js` - the only observability sink; no new logging platform.
- `middlewares/rateLimiter.js` pattern (`express-rate-limit` instances per expensive endpoint, `skip: skipInTest`).

## 3. Existing AI infrastructure

- `AIService` (`services/ai/aiService.js`) is the single choke point for every provider call: timeout, bounded retries, response-shape validation, and structured (non-PII) logging. Module J's optional LLM narrative step must go through this same class, not call a provider directly.
- Provider selection (`services/ai/index.js`, not re-read in full but referenced by every other file) picks `openAiProvider` when `OPENAI_API_KEY` is set, else `fakeProvider` - meaning any new AI-backed method needs both a real and a deterministic-fake implementation to keep tests offline, matching the existing `generateSkillGapSuggestions` pattern.
- Every existing LLM-backed method (`explainMatch`, `generateSkillGapSuggestions`) is explicitly a *narrator* over already-computed deterministic evidence - never the source of the evidence itself. Module I's Copilot deliberately skips the LLM entirely for exactly this reason (see `MODULE_I_ARCHITECTURE.md`).

## 4. Missing infrastructure

- No agent/planner/tool-registry abstraction of any kind.
- No workflow persistence model (nothing like `AgentWorkflowModel`).
- No goal-classification logic (Module I's `detectIntent` classifies a *question* into a Copilot answer intent, not a multi-step *goal*).
- No allowed-action registry / execution-plan concept.
- No queueing - which is fine, since every existing AI/matching operation already completes synchronously within one request, and Module J's workflows are bounded the same way (see Phase 16 guidance against unnecessary polling).

## 5. Proposed agent architecture

**No LangGraph.** It would add a new dependency, a new execution model, and a new
failure surface for a workload that is a short, bounded, mostly-deterministic pipeline
over services that already exist and are already synchronous. Every workflow in this
module has a small, enumerable set of steps known up front from the goal alone - there
is no dynamic branching on intermediate LLM output that would justify a graph engine.
Introducing it here would be exactly the "fashionable dependency" the brief warns against.

Instead: a small, explicit, synchronous **plan-and-execute** pipeline, modeled directly
on how this codebase already composes deterministic services (e.g. `matchController`
composing `matchingService` → `explanationService` → `skillGapService`):

```
Goal (free text) -> CareerGoalAnalyzer (deterministic classifier)
                  -> CareerPlannerService (goal -> ordered CAREER_ACTIONS from a fixed registry)
                  -> CareerWorkflowExecutor (runs each action through toolRegistry,
                     records per-step status/duration, tolerates partial failure)
                  -> CareerActionPlanBuilder (deterministic prioritization over step results)
                  -> AgentNarrativeService (optional LLM paraphrase of validated
                     structured context only, via the existing AIService; deterministic
                     template fallback on failure/timeout)
                  -> AgentWorkflowModel (bounded persistence: goal, plan, status,
                     references, summary - never raw job/profile documents)
```

This is modular (each stage is an independently testable pure/async function),
deterministic where it matters (goal→plan mapping, scoring, ranking, prioritization
are 100% deterministic; only the prose summary may involve an LLM call), and observable
via the same `logger` every other service already uses.

## 6. Required APIs

- `POST /api/v1/agent/execute` - body `{ goal: string, threadId?: string }`; talent-only, authenticated, rate-limited. Executes synchronously and returns the finished workflow (no polling infrastructure, per Phase 16 - every step here is already a synchronous, already-fast call in this codebase).
- `GET /api/v1/agent/workflows/:workflowId` - fetch one persisted workflow, ownership-checked.
- `GET /api/v1/agent/workflows` - list the caller's recent workflows (bounded).

No changes to any existing endpoint.

## 7. Required database changes

One new collection: `AgentWorkflow` (user, goal, targetRole, threadId, status, plan
steps with status/duration/error, a bounded `recommendedActions` array, a bounded
`references` array, and a summary string). No changes to any existing model/schema.
Stores references (ids) to jobs/applications, never full documents or resume text.

## 8. Security considerations

- Every tool call is scoped by `req.user.userId` exactly like `matchController`/`copilotController` - no tool accepts a candidate/user id from the request body, eliminating the IDOR class already avoided everywhere else in this codebase.
- Talent-only (`authorizePermissions("talent")`), same as `/copilot`.
- The agent never calls a mutating endpoint (apply, withdraw, status change) - every tool is read-only, so Phase 7's human-approval requirement is satisfied structurally (there is nothing destructive to approve).
- LLM narrative input is the already-validated structured context only (scores, counts, references) - never resume text, embeddings, or other candidate PII, mirroring `aiService`'s existing "never log the prompt/resume" rule.
- New `agentExecutionLimiter` (expensive, multi-service workflow) added alongside the existing per-endpoint limiters in `rateLimiter.js`.
- Workflow history reads (`GET /agent/workflows[/:id]`) filter by `user: req.user.userId`; a workflow owned by another user 404s rather than 403s, to avoid confirming the id's existence (existing codebase convention where ownership is checked - see `checkPermissions` usage elsewhere - is 403; workflow history instead follows the "don't leak existence" pattern since a workflow id is never advertised to other users at all. This is documented in the implementation report.)
