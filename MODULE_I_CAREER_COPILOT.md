# Module I: AI Career Copilot and Application Intelligence

## What was implemented

Module I adds a grounded, deterministic Career Copilot over existing CareerSync data.

Implemented capabilities:

- Application health and priority classification.
- Follow-up recommendations based on status, application age, and match score.
- Career readiness/profile completeness indicator based on recorded profile fields.
- Recurring missing required-skill frequency across the user's populated applications.
- Structured career insights response.
- Intent-routed Copilot questions for applications, follow-ups, skill gaps, job priorities, and profile readiness.
- Validated references to real jobs, applications, skills, and the candidate profile; the UI routes job references to the job page and application references to the applications page.
- Talent-only `/copilot` frontend page with suggested prompts, loading/error states, readiness, attention items, and skill gaps.

## Existing functionality reused

- `JobApplicationModel` and its real status/appliedAt fields.
- `CandidateProfileModel` and profile processing status.
- Existing populated job data.
- Existing matching engine and match score output.
- Existing normalization utilities.
- Existing authentication middleware and role guard.
- Existing API client, TanStack Query, navigation, and design-system primitives.

## New backend services

- `server/services/career/careerCopilotService.js`
  - `classifyApplicationHealth`
  - `buildCareerInsights`
  - `buildSkillGapFrequency`
  - `detectIntent`
  - `answerCopilotQuery`
- `server/controllers/copilotController.js`
- `server/routes/copilotRoutes.js`

## APIs

### `GET /api/v1/copilot/insights`

Authenticated talent endpoint. Returns readiness, application counts, applications needing attention, average evaluated match score, recurring skill gaps, and grounded recommendations. Application reads are bounded to the most recent 100 records.

### `POST /api/v1/copilot/query`

Authenticated talent endpoint.

Request:

```json
{ "message": "Which applications need follow-up?" }
```

Response shape:

```json
{
  "intent": "FOLLOW_UP",
  "answer": "...",
  "insights": [],
  "references": [
    { "type": "application", "applicationId": "...", "jobId": "..." }
  ]
}
```

Input is limited to 1,000 characters. Empty messages are rejected. References are generated only from records loaded for the authenticated user.

## Deterministic logic

The initial Copilot intentionally does not call an LLM. Deterministic logic is used for:

- Status and application counts.
- Application age.
- Follow-up priority.
- Match score and classification.
- Skill-gap frequency.
- Profile readiness.
- Intent detection.
- Entity references.

Application priority rules:

- Interview: high, prepare for interview.
- Shortlisted: high, prepare for the next step.
- Pending/under review for 7+ days: medium or high depending on match score, recommend follow-up.
- Rejected/withdrawn: low, no current action.
- Recent pending applications: low, monitor for updates.

Profile readiness is a five-signal completeness indicator over skills, experience, education, preferences, and completed resume processing. It is explicitly not a hiring-outcome prediction.

## AI functionality

No LLM call is made in this first implementation. This avoids hallucinated jobs, statuses, skills, dates, recruiter actions, salaries, or interview processes. The existing fake AI provider remains separate and is not used to fabricate Copilot responses.

A future LLM layer may paraphrase a validated deterministic context, but its output must pass reference and claim validation before reaching the UI.

## Frontend

New route: `/copilot`

The page includes:

- Suggested prompts.
- Grounded question form.
- Assistant response state.
- Career readiness score.
- Applications needing attention.
- Recurring skill gaps.
- Links to referenced jobs.
- Loading and error states.

No generic chatbot history or fake conversation persistence was added.

## Database changes

None. The existing application schema does not record a timeline, follow-up date, interview events, notes, or recruiter activity. Module I does not invent those events or add a model without a supported product workflow.

## Security

- Copilot routes are mounted behind `authenticateUser`.
- The frontend is talent-role guarded.
- All data queries use `req.user.userId`.
- Routes enforce `authorizePermissions("talent")`; the frontend role guard is not relied on for security.
- Employer applications and unrelated candidate data are not loaded.
- No resume text, embedding vectors, or private profile fields are sent to the Copilot response.

## Cost control

The current implementation performs no LLM call. It calculates deterministic results from bounded application/profile data. Future LLM calls should be limited to natural-language explanation after deterministic intent routing and context filtering.

## Deferred functionality

The following are not implemented because the current architecture does not support them without inventing or persisting new data:

- Application event timeline.
- Recruiter response/follow-up history.
- Interview preparation based on recorded interview data.
- Conversation/thread memory.
- Persistent CareerInsight or CopilotConversation models.
- Dedicated analytics page and historical weekly activity metrics.
- Dashboard career-action card integration.
- Real LLM-generated resume improvement and career prose.

These are tracked as partial/not implemented in `MODULE_I_FEATURE_STATUS.md`.
