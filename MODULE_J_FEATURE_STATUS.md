# Module J Feature Status

Validation date: 2026-09-13

| Feature | Backend | API | Frontend | AI / data grounding | Tests | Status |
|---|---|---|---|---|---|---|
| Career goal classification | `careerGoalAnalyzer.js` | Via `/agent/execute` | Career Agent goal input | Deterministic regex classifier, no LLM | Yes | COMPLETE |
| Allowed-action execution planning | `careerPlannerService.js` + `careerActionRegistry.js` | Via `/agent/execute` | Step list shown in UI | Fixed goal->plan table, no LLM | Yes | COMPLETE |
| Job Discovery Agent | `tools/job.tools.js` | Via `/agent/execute` | Top matched jobs | Reuses `calculateMatchesForCandidate` (semantic retrieval + scoring) | Yes | COMPLETE |
| Job Matching Agent | `tools/match.tools.js` | Via `/agent/execute` | Match scores in job cards | Reuses `getMatchWithProfiles`/`matchingService` | Yes | COMPLETE |
| Skill Gap Agent | `tools/skillGap.tools.js` | Via `/agent/execute` | Skill gap badges | Reuses `skillGapService.buildSkillGapAnalysis` | Yes | COMPLETE |
| Application Agent | `tools/application.tools.js` | Via `/agent/execute` | Recommended actions | Reuses Module I `careerCopilotService.buildCareerInsights` | Yes | COMPLETE |
| Career Strategy aggregation | `careerActionPlanBuilder.js` | Via `/agent/execute` | Prioritized action plan | Deterministic priority scoring over prior steps | Yes | COMPLETE |
| Interview preparation (Workflow C) | `tools/career.tools.js` (`prepareInterview`) | Via `/agent/execute` | Interview prep card | Reuses match + skill-gap evidence | Yes | COMPLETE |
| Partial-failure handling | `careerWorkflowExecutor.js` | `status: PARTIAL` in response | "Some steps could not complete" notice | Real per-step status, no faked progress | Yes | COMPLETE |
| LLM narrative summary | `agentNarrativeService.js` + `aiService.generateCareerNarrative` | `summary` field | Shown in Career Agent panel | LLM paraphrases already-computed context only; deterministic fallback on failure | Yes | COMPLETE |
| Agent memory (thread job recall) | `careerWorkflowExecutor.js` (`recallJobIdFromThread`) | `threadId` request field | N/A (implicit) | Only a prior job reference is recalled | Yes | COMPLETE |
| Workflow persistence/history | `AgentWorkflowModel.js` | `GET /agent/workflows[/:id]` | Recent-workflow sidebar | Bounded fields only (ids, titles, scores, summary) | Yes | COMPLETE |
| Rate limiting | `agentExecutionLimiter` | Applied to `POST /agent/execute` | N/A | 15 requests / 15 min | Existing limiter pattern (not itself re-tested) | COMPLETE |
| Security / authorization | Every tool scoped by `req.user.userId` | Talent-only, ownership-checked history reads | RoleGuard on `/copilot` | N/A | Yes | COMPLETE |
| Resume-rewrite suggestions | Not implemented (reuses skill-gap/readiness data instead) | No dedicated field | No | Would require a resume-text-aware LLM pipeline not present in this codebase | No | PARTIAL |
| Async/polling workflow execution | Not implemented (synchronous only) | No | No | Not needed at today's plan sizes (2-5 steps) | No | NOT IMPLEMENTED (by design) |
| LangGraph / external agent framework | Not adopted | N/A | N/A | Evaluated and rejected - see `MODULE_J_ARCHITECTURE_AUDIT.md` | N/A | NOT APPLICABLE (deliberate) |

## Status definitions

- **COMPLETE**: implemented, grounded in real CareerSync data, exposed through API/UI,
  and covered by focused tests.
- **PARTIAL**: some infrastructure exists, but the full requested behavior is out of
  scope for this module without inventing unsupported data or a new LLM pipeline.
- **NOT IMPLEMENTED (by design)**: intentionally omitted because the current workflow
  sizes don't justify the added complexity (Phase 16's "simplest architecture
  appropriate for workflow duration").
