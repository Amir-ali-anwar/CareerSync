# Module J: Agentic Job Search & Autonomous Career Workflow Engine

## Architecture

A synchronous plan-and-execute pipeline, not a graph/agent framework (see
`MODULE_J_ARCHITECTURE_AUDIT.md` Section 5 for why LangGraph was evaluated and rejected):

```
Goal (free text) -> CareerGoalAnalyzer (deterministic classifier)
                  -> CareerPlannerService (goal -> ordered CAREER_ACTIONS)
                  -> CareerWorkflowExecutor (runs each action via toolRegistry,
                     records per-step status/duration, tolerates partial failure)
                  -> CareerActionPlanBuilder (deterministic prioritization)
                  -> AgentNarrativeService (optional LLM paraphrase, deterministic
                     fallback on failure)
                  -> AgentWorkflowModel (bounded persistence)
```

Every stage is a small, independently testable, mostly-synchronous function. Nothing in
this pipeline queues work or polls for completion - every tool call it makes was already
synchronous in this codebase before Module J existed.

## Workflow engine

`server/services/agent/careerWorkflowExecutor.js` runs one workflow per `POST
/api/v1/agent/execute` call:

1. Recalls a previously-referenced job id from the same `threadId`, if any (Phase 13 memory).
2. Classifies the goal (`careerGoalAnalyzer.js`) - a free-text message maps to one of the
   fixed `CAREER_GOALS` via ordered regex, or `UNKNOWN`.
3. Builds an execution plan (`careerPlannerService.js`) - a fixed, goal-indexed list of
   `CAREER_ACTIONS`, each with a per-action parameter resolver.
4. Executes each step in order through `toolRegistry.js`, catching `AgentToolError`/any
   error per step so one failure doesn't abort the workflow (Phase 15).
5. Builds a `CareerActionPlan` (`careerActionPlanBuilder.js`) from whatever step results
   succeeded.
6. Builds a narrative (`agentContextBuilder.js` + `agentNarrativeService.js`) - an
   optional LLM call over already-computed facts only, with a deterministic fallback.
7. Persists the workflow (`AgentWorkflowModel`) and returns it.

An `UNKNOWN` goal short-circuits after step 2: no plan runs, and the response is a
clarifying message naming supported goal types.

## Agents (Phase 3)

Implemented as tool modules, not separate LLM agents - each "agent" in the brief is a
thin, testable service composing existing engines, per the "reuse the existing engine,
don't duplicate scoring logic" instruction:

- **Job Discovery** - `tools/job.tools.js`. Wraps `matchingService.calculateMatchesForCandidate`
  (candidate-embedding retrieval + scoring + ranking, already existed) and
  `getMatchWithProfiles` (single explicit job).
- **Job Matching** - `tools/match.tools.js`. Wraps `getMatchWithProfiles` directly; no
  second scorer.
- **Skill Gap** - `tools/skillGap.tools.js`. Wraps `skillGapService.buildSkillGapAnalysis`
  over the candidate's top 3 matched jobs.
- **Application** - `tools/application.tools.js`. Wraps Module I's
  `careerCopilotService.buildCareerInsights` for application health/priority.
- **Career Strategy** - `tools/career.tools.js` (`getCareerInsights`) + the executor's
  aggregation step. Combines matches, skill gaps, applications, and readiness into the
  final `CareerActionPlan` - no separate strategy-generation logic beyond that
  aggregation and the optional narrative.
- **Interview Prep** (Workflow C) - `tools/career.tools.js` (`prepareInterview`). Builds
  on the same match + skill-gap evidence as the other tools.

## Tools (Phase 4)

`server/services/agent/tools/*.js`, dispatched only through `toolRegistry.js`. Every
tool:

- Takes the authenticated `userId` as its first argument - never a user id from request
  input.
- Validates its inputs with `mongoose.isValidObjectId` and throws a typed
  `AgentToolError` (never a raw/ambiguous error) on invalid input or an unmet
  precondition (job not found, etc).
- Returns a structured, already-shaped-for-the-API object - `job.tools.js`'s
  `toJobSummary` trims a full Mongoose Job document down to id/title/company/type/mode/
  location before it ever reaches a step result.
- Degrades gracefully rather than erroring on missing-but-optional data (a candidate
  with no profile still gets a `GET_CANDIDATE_PROFILE` result; matching already handles
  a null profile).
- Is independently unit-tested (`tests/agent/toolAuthorization.test.js`).

## Planner (Phase 2)

`server/services/agent/careerActionRegistry.js` defines the fixed, allowed `CAREER_ACTIONS`
and one `EXECUTION_PLANS` table mapping every `CAREER_GOALS` value to an ordered action
list - the planner can never emit an action outside this registry
(`careerPlannerService.test.js` asserts this for every goal). Per-action parameters are
resolved from the goal analysis plus whatever earlier steps already produced (e.g.
`ANALYZE_SKILLS` reads job ids off the prior `SEARCH_JOBS` step) - never invented.

## Context builder (Phase 11)

`agentContextBuilder.js` is the only object the narrative LLM call is allowed to see:
counts, titles, company names, and scores already computed by the executor - never a
raw Mongoose document, resume text, or embedding vector.

## LLM usage (Phase 10)

Exactly one LLM call in the whole engine: `AIService.generateCareerNarrative`
(`services/ai/aiService.js`), added alongside the existing `explainMatch`/
`generateSkillGapSuggestions` methods with the same contract - the provider narrates
evidence it is given, it never becomes the source of that evidence. Both `fakeProvider`
(default, deterministic, used in every test) and `openAiProvider` implement it.
`agentNarrativeService.js` wraps this call and falls back to a deterministic template
built from the same context on any failure - the workflow's `status` and
`recommendedActions` never depend on the LLM call succeeding.

Everything else - goal classification, planning, retrieval, scoring, ranking, skill-gap
analysis, application-health classification, and action-plan prioritization - is
deterministic backend logic, reusing the exact engines Modules E-I already built.

## Guardrails (Phase 12)

- No tool ever fabricates a job, skill, application, or score - every field in a step
  result traces back to a real document or a real `calculateMatch`/`buildSkillGapAnalysis`
  output.
- The narrative LLM call is given only the already-validated `AgentContextBuilder`
  output, with an explicit "use ONLY these facts" system prompt (mirroring `explainMatch`).
- `CareerActionPlanBuilder` only emits an item when the corresponding step actually
  completed - a failed/skipped step contributes nothing (see
  `careerWorkflowExecutor.partialFailure.test.js`).

## Memory (Phase 13)

An optional `threadId` on the request. The only thing carried across a thread is a
previously-referenced job id (used to fill in a missing target job for
`INTERVIEW_PREPARATION` on a natural follow-up like "now help me prepare for it"). No
conversation transcript, resume text, or profile data is stored or replayed.

## Observability (Phase 14)

Reuses `utils/logger.js` (the same structured JSON logger `aiService.js` already uses) -
`agent_step_completed`, `agent_step_failed`, and `agent_workflow_completed` log lines
carry `workflowId`/`goal`/`action`/`durationMs`/error message, never PII or prompt/
resume content. No new logging platform was introduced.

## Error handling (Phase 15)

- Missing candidate profile: not an error - `GET_CANDIDATE_PROFILE` returns
  `{ exists: false, status: "not_found" }` and downstream matching degrades the same way
  it already did for Module E.
- No jobs available: `SEARCH_JOBS` returns `{ items: [], total: 0 }`, not an error.
- A single job's skill-gap analysis failing (e.g. deleted between steps) is swallowed at
  the tool's own granularity and simply excluded from `topGaps`.
- Any step throwing is caught by the executor, recorded as `{ status: "failed", error }`,
  and does not stop later steps from running.
- Workflow `status` is `COMPLETED` (no failures), `PARTIAL` (some steps failed, at least
  one succeeded), or `FAILED` (nothing succeeded) - computed from the actual per-step
  outcomes, never faked.
- An unclassifiable goal is not an error - it is the `UNKNOWN` goal, answered with a
  clarifying message.
- LLM failure never fails the workflow (see LLM usage above).

## APIs (Phase 16)

- `POST /api/v1/agent/execute` - `{ goal: string, threadId?: string }`. Talent-only,
  rate-limited (`agentExecutionLimiter`, 15/15min), synchronous - runs and returns the
  completed (or partial) workflow in one response. No polling infrastructure: every step
  in this pipeline was already a fast, synchronous call before Module J existed, so
  there is nothing to poll for.
- `GET /api/v1/agent/workflows/:workflowId` - fetch one persisted workflow, scoped to
  `req.user.userId`. A workflow owned by a different user 404s (a workflow id is never
  exposed to anyone but its owner, so there's nothing to "forbid" - see the audit doc).
- `GET /api/v1/agent/workflows` - the caller's most recent 20 workflows.

## Frontend (Phase 17-19)

Integrated into the existing `/copilot` page rather than a new route or a second AI
surface - the module brief explicitly warns against duplicate AI interfaces, and this
codebase already has exactly one AI-facing page. `/copilot` now has two tabs: **Career
Agent** (new, default) and **Ask Copilot** (Module I's existing deterministic Q&A,
unchanged). New pieces:

- `components/agent/career-agent-panel.tsx` - goal input, suggested-goal chips
  (Phase 18), real step-by-step progress (Phase 6 - only actually-completed steps are
  shown as done), the prioritized action plan, top matched jobs, skill gaps, and
  interview-prep summary when present, plus a recent-workflow-history sidebar.
- `hooks/use-agent.ts` / `lib/api/agent.ts` / `types/agent.ts` - same TanStack Query +
  typed-API-client pattern as every other feature area.
- A new "AI Career Agent" card on the talent dashboard (Phase 19) linking into the same
  page/tab.

## Security (Phase 21)

Identical pattern to every existing talent-only route: `authenticateUser` +
`authorizePermissions("talent")`, every tool scoped by `req.user.userId` only (no tool
accepts a candidate/user id from the request), and workflow history reads filtered by
`user: req.user.userId`.

## Cost control (Phase 22)

- `agentExecutionLimiter` (15 requests / 15 minutes) on `POST /agent/execute` - the most
  expensive single endpoint in the API (several matching/skill-gap calls plus one billed
  LLM narrative call per request).
- Goal text capped at 1,000 characters, `threadId` at 200.
- `SEARCH_JOBS`/`ANALYZE_SKILLS` are bounded (10 and 3 jobs respectively) - no workflow
  triggers an unbounded scan.
- Workflow history persistence stores only ids, titles, scores, and generated text -
  never raw documents, resume text, or embeddings.

## Known limitations

- Goal classification and target-role extraction are regex-based, not an LLM - a goal
  phrased very differently from the documented examples may classify as `UNKNOWN`. This
  is an intentional determinism/cost tradeoff, matching Module I's precedent.
- `RESUME_IMPROVEMENT` reuses skill-gap and readiness data rather than generating real
  resume rewrite suggestions - there is no resume-text-aware LLM pipeline in this
  codebase yet, and inventing one risked exactly the hallucination the brief warns
  against.
- Workflow execution is fully synchronous; a goal whose plan involved many more steps
  than today's (bounded, 2-5 actions) could eventually need an async/polling model -
  not needed at today's scope.
