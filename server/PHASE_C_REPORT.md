# Phase C Final Report — Resume Intelligence Pipeline

Career Sync backend. Covers the resume-processing pipeline built on top of the P0/P1/P2
hardening pass and the Phase 4–7 AI foundation work (see `AUDIT_REPORT.md` and
`TASKS.md` for that earlier history).

---

## 1. Architecture Implemented

```
Controller (jobController.js#applyForJob)
    ↓  fire-and-forget, HTTP response never waits on this
resumeProcessingService.triggerResumeProcessing()
    ↓
resumeProcessingService.processResumeForApplication()  ← atomically claims the application (pending→processing)
    ↓
textExtraction.extractTextFromCv()  ← reads via cvStorage.readCvBuffer(), real pdf-parse
    ↓
aiService.extractResumeProfile()  ← fake provider (no OPENAI_API_KEY), validated shape
    ↓
CandidateProfileModel.findOneAndUpdate(upsert)  ← one profile per user, overwritten + versioned
```

The "Application Service" and "Resume Processing Service" layers from the originally
suggested diagram were combined into one module (`resumeProcessingService.js`) rather
than adding a separate wrapper around the existing controller-owns-CRUD convention —
introducing a full parallel "Application Service" would have been a bigger, riskier
refactor than this phase needed, per the "adapt rather than blindly create layers"
instruction.

**Sync vs. async decision:** asynchronous, fire-and-forget — no queue infrastructure.
This mirrors the already-established pattern for verification emails
(`dispatchVerificationEmail` in `controllers/authController.js`), needs zero new
infrastructure, and keeps the CV-upload response fast regardless of AI latency/retries.
This is a deliberate choice for this phase; a real queue is future work if volume ever
demands it.

---

## 2. Files Changed

- `services/resume/textExtraction.js` (new)
- `services/resume/resumeProcessingService.js` (new)
- `models/JobApplicationModel.js` — added `resumeProcessingStatus`, `resumeProcessingError`
- `models/CandidateProfileModel.js` — added `processingStatus`, `profileVersion`
- `utils/storage/localDiskCvProvider.js` + `utils/cvStorage.js` — added `readCvBuffer`
- `utils/constants.js` — added `RESUME_PROCESSING_STATUS`
- `controllers/jobController.js` — wired `triggerResumeProcessing` into `applyForJob`
- `services/ai/aiService.js` — added response-shape validation (`MalformedAIResponseError`)
- `config/swagger.js` — documented `resumeProcessingStatus` on the `JobApplication` schema
- `package.json` — added `pdf-parse` dependency
- `BACKEND_FEATURES.md`, `TASKS.md` — updated to reflect this phase

---

## 3. CandidateProfile Schema (additions this phase)

- `processingStatus`: `pending` / `processing` / `completed` / `failed`
- `profileVersion`: Number, increments on each successful overwrite

Everything else (skills, education, certifications, preferredRoles, preferredLocations,
workModePreference, resumeText, resumeMetadata) was already introduced in the earlier
Phase 5 data-model work.

---

## 4. Resume Extraction

Real PDF extraction via `pdf-parse` (new dependency — flagged before adding, confirmed
working against real fixtures). **DOC/DOCX are a documented, not-silent gap**
(`UnsupportedFileTypeError` is thrown, not swallowed) — building full legacy-Word
support was out of scope for this phase; it fails predictably rather than producing
garbage output.

A real `pdf-parse@1.1.1` incompatibility with this project's ESM (`"type": "module"`)
setup was discovered and worked around along the way: the package's `index.js` runs an
internal debug/demo code path (reading a bundled test fixture) whenever it can't detect
a real CommonJS parent module, which is exactly what happens when it's imported via
ESM. The fix imports the package's inner implementation file directly
(`pdf-parse/lib/pdf-parse.js`), bypassing that debug check entirely via a plain, ordinary
ESM import — no extra dependency or workaround package needed.

---

## 5. AIService Integration

`aiService.extractResumeProfile` now validates the provider's response shape before
returning it to the caller, throwing `MalformedAIResponseError` on a bad shape. This
centralizes that contract check where the contract is defined, so
`resumeProcessingService` (and any future caller) doesn't need to re-validate the shape
itself — it can trust the result or catch a clearly-typed failure.

---

## 6. Fake Provider Behavior

Verified via the real end-to-end HTTP test: a real PDF → real extracted text → fake
provider → genuinely correct structured skills/experience/education, not arbitrary
placeholder data. Example: a resume stating "6 years of experience... Skilled in React,
Node.js, MongoDB, and AWS... Bachelor's degree" correctly produces
`yearsOfExperience: 6`, the four listed skills, and a `Bachelor's` degree entry.

---

## 7. Application Flow Changes

`applyForJob`'s response shape is unchanged; `application.resumeProcessingStatus` is a
new field on the existing `JobApplication` object (starts `"pending"`). No breaking
change for existing consumers — confirmed the client has zero API calls wired up to this
backend yet.

---

## 8. Failure-Handling Strategy

Every failure path (text-extraction failure, unsupported file type, AI-service failure,
malformed AI response) sets `resumeProcessingStatus: "failed"` on the `JobApplication`
plus a short, non-sensitive reason string, and reflects `processingStatus: "failed"` on
the `CandidateProfile` **without overwriting that profile's existing good data** —
verified by test that a corrupt second CV never destroys a candidate's
previously-successful profile fields.

---

## 9. Idempotency/Versioning Strategy

Exactly one `CandidateProfile` per user (unique index on `user`, already established in
Phase 5). A new resume **overwrites** the same document's extracted fields and
increments `profileVersion` — it does not fork a new profile or maintain a version
history. `resumeMetadata.sourceApplicationId` always points at whichever application
most recently produced the current data. Verified by test: two applications from the
same talent (different jobs, different CV content) produce exactly one
`CandidateProfile` document, reflecting the latest resume's data with `profileVersion`
incremented to 2.

Documented directly in `models/CandidateProfileModel.js`'s header comment as the
authoritative source of this decision.

---

## 10. Tests Added (this phase)

- `tests/textExtraction.test.js` — 4 tests (real `pdf-parse` integration: valid PDF,
  corrupt PDF, unsupported file type, missing file)
- `tests/resumeProcessingService.test.js` — 9 tests (successful flow, idempotency on
  re-trigger, no-duplicate-on-reprocess, extraction failure, unsupported file type,
  AI-service failure, malformed AI response, failure-doesn't-corrupt-existing-data,
  cross-candidate data isolation)
- `tests/jobApplications.test.js` — 2 new end-to-end tests (real PDF upload through the
  actual HTTP endpoint to a persisted `CandidateProfile`; unparseable-CV failure path)
- `tests/aiService.test.js` — 1 new test (`MalformedAIResponseError` on a bad provider
  response shape)
- `tests/fixtures/valid-sample.pdf`, `tests/fixtures/corrupt-sample.pdf` — real PDF
  fixtures used by the above

**21 new tests this phase.**

---

## 11. Total Tests Passing

**187/187**, 16 suites — up from 133 at the start of the overall hardening engagement,
171 at the start of this specific phase.

---

## 12. Remaining Limitations

- No HTTP endpoint reads `CandidateProfile` or extracted resume text yet — deliberately,
  so "not exposed through unauthorized endpoints" is satisfied by non-existence rather
  than by access-control-after-the-fact. The requested authorization tests ("employer
  accessing unauthorized candidate data") were addressed at the data-isolation level
  instead (verified profiles never cross-contaminate between candidates), since there is
  no endpoint yet to actually attack.
- DOC/DOCX resume extraction is unimplemented (`UnsupportedFileTypeError`, not silent
  failure).
- Real AI output quality is still unverified — everything currently runs on the fake
  provider until `OPENAI_API_KEY` is supplied; `services/ai/providers/openAiProvider.js`
  itself has never been exercised against a live API in this environment.

---

## Explicit Scope Boundary Honored

Per the phase brief, this pipeline does **not** implement: embeddings, a vector
database, semantic search, job matching, recommendations, skill-gap analysis, LLM "why
you match" explanations, agents, notifications, messaging, or analytics. The only
objective delivered is: **CV → extracted text → AI profile extraction → CandidateProfile
persistence.**

Stopping here pending confirmation that this pipeline is complete, tested, and stable
before any Phase D work begins.
