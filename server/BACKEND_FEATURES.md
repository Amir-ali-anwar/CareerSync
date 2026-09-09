# CareerSync Backend - Features Documentation

## Overview
CareerSync is a job portal API that connects **Talents** (job seekers) with **Employers** (recruiters) and **Organizations**.

**Tech Stack:** Node.js, Express.js, MongoDB (Mongoose), JWT Authentication

## Module F - Embeddings and Semantic Search

- Existing `AIService` providers generate embeddings; the fake provider remains deterministic and network-free for development and CI.
- `EmbeddingService` builds deterministic candidate/job text, hashes it, and asynchronously writes private, versioned vectors to MongoDB-derived profile indexes.
- `v1` matching remains deterministic; `v2` adds a bounded 10% semantic similarity contribution without exposing raw vectors.
- Talent semantic search: `GET /api/v1/jobs/search/semantic?q=...`, with active/deadline checks, filters, pagination, and threshold controls.
- Run `npm run backfill:embeddings` manually to index existing completed profiles. MongoDB remains authoritative; the vector index is derived data.

## Module G - Explainable "Why You Match"

- `services/matching/explanationService.js` is a pure, synchronous transform of Module E's
  own `MatchResult` (matched/missing skills, experience/seniority/domain/preference
  comparisons, component scores) into a structured explanation - no LLM call, no
  re-running matchers or embeddings, no new database queries or persistence.
- `services/matching/matchLevel.js` centralizes the 0-100 -> match-level classification
  (`poor_match` / `weak_match` / `moderate_match` / `strong_match` / `excellent_match`)
  used by the explanation.
- `GET /api/v1/jobs/:jobId/match/explanation` — the authenticated talent's own explanation
  (IDOR-safe, same identity rule as `GET /jobs/:jobId/match`).
- `GET /api/v1/applications/:jobId/:applicantId/match/explanation` — the owning employer's
  explanation for one of their job's actual applicants (`checkPermissions` + an existing
  `JobApplication` required; not any arbitrary candidate id).
- Output includes matched/missing skills (required -> high importance, preferred ->
  medium), partial matches (near-misses only - e.g. experience within 80% of the
  requirement, adjacent seniority level), evidence-backed strengths and improvement areas
  (capped, not a full skill-gap analysis), a per-dimension score breakdown, a match-level
  classification, and a deterministic (non-LLM) human-readable summary.
- Never exposes resume text, embeddings, or any field the underlying `MatchResult` doesn't
  already carry - see `MODULE_G_REPORT.md` for the full design writeup and test coverage.

## Module H - Skill Gap Analysis & Career Improvement Engine

- `services/career/skillGapService.js` sits directly on top of the same `MatchResult`
  Module G reads (imports `buildMissingSkills` from `explanationService.js` and
  `classifyMatchLevel` from `matchLevel.js` rather than reimplementing either) - pure,
  synchronous, no LLM call, no re-running matchers/embeddings, no new database queries
  beyond the one profile fetch `matchingService.getMatchWithProfiles` already made
  (a small additive refactor of the existing `calculateMatchForCandidateAndJob` that
  changed no existing exported behavior).
- Gap categories: `required_skill`, `preferred_skill`, `experience`, `seniority`,
  `domain`, and `certification` (the one comparison Module E/G don't compute at all -
  `CandidateProfile.certifications` vs `JobProfile.certifications`, a plain set-difference
  since both are flat name lists). Education gap analysis was evaluated and deliberately
  **not** implemented - see `MODULE_H_REPORT.md`'s Limitations for why.
- Deterministic `severity` (critical/high/medium/low) and `priority` (high/medium/low)
  per gap, and a `prioritizedRoadmap` ranked by priority tier first, then by the matching
  algorithm's own dimension weight (`algorithmVersions.js`) - documented explicitly in
  `services/career/skillGapService.js`, not an arbitrary ordering.
- `GET /api/v1/jobs/:jobId/skill-gap` - the authenticated talent's own analysis only
  (IDOR-safe, same identity rule as `/jobs/:jobId/match`). Deliberately **candidate-only**:
  unlike Module G, there is no employer-facing counterpart - a personal improvement
  roadmap is not something an employer needs to evaluate a candidate (see
  `MODULE_H_REPORT.md`'s Security section for the full reasoning).
- No score simulation ("if you learned X, your score would become Y") - `impact` is a
  qualitative label derived from the same dimension-weight/severity evidence as
  `priority`, deliberately not a predicted score delta.

---

## 🔐 Authentication Module

### Endpoints: `/api/v1/auth`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/register` | Register new user (talent/employer) | Public |
| POST | `/login` | Login with email & password | Public |
| GET | `/logout` | Logout user (clear cookies) | Public |
| GET | `/verify-Email` | Verify email with token | Public |
| POST | `/resend-verification` | Resend verification email | Public |
| PATCH | `/updateUser` | Update user profile | Authenticated |
| PATCH | `/updateUserPassword` | Change password | Authenticated |
| GET | `/showCurrentUser` | Get current user info | Authenticated |

### Features:
- ✅ Email verification with expiring tokens (10 min)
- ✅ Password hashing with bcrypt
- ✅ JWT tokens stored in httpOnly signed cookies
- ✅ Refresh token rotation
- ✅ Rate limiting (5 login attempts/min, 10 registrations/hour)
- ✅ Role-based registration (talent vs employer)
- ✅ Employer-specific fields (companyName, companySize, industry)

---

## 💼 Jobs Module

### Endpoints: `/api/v1/jobs`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create new job posting | Employer |
| GET | `/` | Get all jobs (with filters) | Employer |
| GET | `/:id` | Get single job by ID | Employer |
| PATCH | `/:id` | Update job | Employer |
| DELETE | `/:id` | Delete job | Employer |
| PATCH | `/:jobId/close` | Close job (stop applications) | Employer |
| POST | `/applyForJob/:id` | Apply for a job | Talent |
| GET | `/myApplications` | Get user's applications | Talent |

### Features:
- ✅ Job CRUD operations
- ✅ Job types: full-time, part-time, internship
- ✅ Job statuses: pending, interview, declined
- ✅ Application deadline enforcement
- ✅ Job closing functionality
- ✅ Search & filtering (by status, type, search term)
- ✅ Sorting (newest, oldest, a-z, z-a)
- ✅ Pagination support
- ✅ Permission checks (only job creator can modify)

---

## 📝 Job Applications Module

### Endpoints: `/api/v1/applications`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/:jobId` | Get applications for a job | Employer |
| PATCH | `/:jobId/:applicantId/status` | Update application status | Employer |
| PATCH | `/:id/withdraw` | Withdraw application | Talent |
| GET | `/my-applications` | Get my applications | Talent |

### Features:
- ✅ CV upload (PDF, DOC, DOCX)
- ✅ Cover letter, portfolio, LinkedIn profile
- ✅ Skills and experience level tracking
- ✅ Application statuses: pending, under review, shortlisted, interview, rejected
- ✅ Withdrawal only allowed before decision made
- ✅ Duplicate application prevention
- ✅ Rejected applicant re-application blocked

### Application Fields:
- CV (required)
- Cover Letter
- Portfolio URL
- LinkedIn Profile
- Skills (array)
- Experience Level (beginner/intermediate/expert)
- Availability
- Location Preferences
- References

---

## 👥 Talents Module

### Endpoints: `/api/v1/talents`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all talents who applied | Employer |
| GET | `/:talentId` | Get talent by ID | Employer |
| GET | `/export` | Export applications to CSV | Employer |

### Features:
- ✅ View all applicants for employer's jobs
- ✅ Individual talent profile viewing
- ✅ CSV export of applications with:
  - Talent name, email, phone
  - Job title, position, company
  - Application status, date

---

## 🏢 Organizations Module

### Endpoints: `/api/v1/organization`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create organization | Employer |
| GET | `/` | Get my organizations | Employer |
| PATCH | `/:id` | Update organization | Employer |
| DELETE | `/:id` | Delete organization | Employer |
| GET | `/public` | List all public organizations | Public |
| GET | `/public/:id` | Get single public organization | Public |
| POST | `/:id/follow` | Follow organization | Talent |
| GET | `/:id/followers` | Get organization followers | Employer |
| GET | `/:id/is-following` | Check if following | Talent |
| GET | `/public-organizations/:id/followers/count` | Get follower count | Public |

### Features:
- ✅ Organization CRUD
- ✅ Max 4 organizations per employer
- ✅ Company profiles with:
  - Logo, website, description, mission, culture
  - Industry, company size, HQ location
  - Social links (LinkedIn, Twitter, Facebook, Glassdoor)
  - Office photos, cover image, intro video
  - Awards, founding year
- ✅ Organization types: Private, Public, Non-Profit, Startup, Government
- ✅ Follow/unfollow functionality for talents
- ✅ URL validation for website and social links

---

## 🔒 Security Features

| Feature | Implementation |
|---------|----------------|
| Authentication | JWT with signed httpOnly cookies |
| Password Security | bcrypt hashing with salt |
| Rate Limiting | Express-rate-limit (login, register, verification) |
| Input Validation | Mongoose validators, custom validation |
| CORS | Configurable origin with credentials |
| Error Handling | Centralized error middleware |
| Permissions | Role-based + resource ownership checks |

---

## 🛠️ Middleware Stack

| Middleware | Purpose |
|------------|---------|
| `auth.js` | JWT verification, user extraction |
| `permissions.js` | Role authorization & resource ownership |
| `rateLimiter.js` | Rate limiting for auth endpoints |
| `fileuploader.js` | Multer-based CV upload |
| `error-handler.js` | Centralized error responses |
| `not-found.js` | 404 handler |

---

## 📊 Data Models

### User
- name, lastName, email, password, phone
- location (country, city)
- role (talent/employer)
- profileImage (auto-generated avatar)
- verification fields (token, expiry, status)
- employer fields (company name, size, industry)

### Job
- company, title, position
- jobType, jobStatus, jobLocation
- applicationDeadline, isClosed
- createdBy (employer reference)
- applicants (embedded array)

### JobApplication
- job, talent references
- cv, coverLetter, portfolio, linkedInProfile
- skills, experienceLevel, availability
- status, appliedAt

### Organization
- name, logo, website, emailDomain
- description, mission, culture
- industry, companySize, hqLocation
- socialLinks, locations
- followers, createdBy

### Token
- refreshToken, ip, userAgent
- user reference, isValid

---

## 📧 Email Features

- ✅ Verification email on registration
- ✅ Resend verification capability
- ✅ Configurable email via Nodemailer
- ✅ Mailgen for email templates

---

## 📖 API Documentation

- ✅ Swagger/OpenAPI documentation
- ✅ Available at `/api-docs`
- ✅ Interactive API explorer
- ✅ All endpoints documented with schemas

---

## 🚀 Production Ready Features

- ✅ CORS configuration with credentials
- ✅ MongoDB connection error handling (exits on failure)
- ✅ Environment variable support, with fail-fast startup checks for required secrets
- ✅ Structured (JSON) request logging with per-request correlation IDs (`X-Request-Id`)
- ✅ Global + per-endpoint rate limiting (auth, job creation/application, CSV export, organization creation)
- ✅ Liveness (`GET /healthz`) and readiness (`GET /readyz`) probes
- ✅ Docker support (multi-stage-free, non-root runtime user)
- ✅ CI pipeline (GitHub Actions) running the full test suite on every push/PR
- ✅ Git-ignored sensitive files (.env); `.env.example` documents required variables
- ✅ Authenticated, ownership-checked CV access (no public static file serving)
- ✅ Refresh tokens hashed at rest; separate signing secrets for access vs. refresh JWTs

---

## 📁 Project Structure

```
server/
├── app.js                 # Express app entry point
├── config/
│   └── swagger.js         # Swagger configuration
├── controllers/
│   ├── authController.js
│   ├── jobController.js
│   ├── jobApplicationController.js
│   ├── talentController.js
│   └── organizationController.js
├── db/
│   └── connect.js         # MongoDB connection
├── errors/
│   ├── CustomAPIError.js
│   ├── bad-request.js
│   ├── not-found.js
│   └── unAuthenticated.js
├── middlewares/
│   ├── auth.js
│   ├── permissions.js
│   ├── rateLimiter.js
│   ├── fileuploader.js
│   ├── error-handler.js
│   └── not-found.js
├── models/
│   ├── User.js
│   ├── JobsModel.js
│   ├── JobApplicationModel.js
│   ├── OrganizationModel.js
│   ├── CandidateProfileModel.js
│   ├── JobProfileModel.js
│   └── Token.js
├── routes/
│   ├── authRoutes.js
│   ├── jobRoutes.js
│   ├── jobApplicationRoutes.js
│   ├── talentRoutes.js
│   └── OrganizationRoutes.js
├── utils/
│   ├── constants.js
│   ├── createTokenUser.js
│   ├── jwt.js
│   ├── mailConfig.js
│   ├── normalization.js       # shared skill-alias/title normalization
│   ├── cvStorage.js
│   └── sendVerificationEmail.js
└── services/
    ├── ai/
    │   ├── aiService.js         # timeout/retry/logging wrapper - the only entry point
    │   ├── index.js             # selects a provider based on OPENAI_API_KEY presence
    │   └── providers/
    │       ├── fakeProvider.js  # deterministic, no external dependency (default)
    │       └── openAiProvider.js
    ├── resume/
    │   ├── textExtraction.js         # real PDF extraction via pdf-parse
    │   └── resumeProcessingService.js
    ├── job/
    │   └── jobIntelligenceService.js
    └── matching/
        ├── algorithmVersions.js      # single source of truth for weights/version
        ├── scoreAggregator.js
        ├── matchingService.js        # pure calculateMatch() + DB-aware wrappers
        └── matchers/
            ├── requiredSkillsMatcher.js
            ├── preferredSkillsMatcher.js
            ├── experienceMatcher.js
            ├── seniorityMatcher.js
            ├── domainMatcher.js
            ├── preferenceMatcher.js
            └── semanticMatcher.js    # stub - Module F's extension point
```

---

## 🔧 Environment Variables

See `.env.example` for the full, authoritative list. Summary:

```env
NODE_ENV=development
PORT=4000
MONGO_URL=<mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>              # required - server refuses to start without it
JWT_REFRESH_SECRET=<a_different_secret>   # required - must differ from JWT_SECRET
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=30d
CLIENT_URL=http://localhost:3000          # required when NODE_ENV=production
SALT_ROUNDS=10
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
CV_STORAGE_PROVIDER=local
OPENAI_API_KEY=
AI_REQUEST_TIMEOUT_MS=15000
AI_MAX_RETRIES=1
```

---

## 🤖 AI Service Layer — Abstraction Built, Real Provider Unverified

`services/ai/` (`AIService`) is the single boundary every AI-shaped operation goes
through: `generateEmbedding`, `extractResumeProfile`, `explainMatch`,
`analyzeSkillGap`. It handles timeouts, bounded retries, and structured observability
logging (never logging prompts or resume content).

**Without `OPENAI_API_KEY` set** (the current state of every environment this has run
in, including production's `.env`), it runs entirely against a deterministic,
dependency-free fake provider - real model output does not exist yet. **With a key
set**, it switches to a real OpenAI-backed provider with zero code changes elsewhere -
but that provider has not been exercised against a live API in this environment and
needs a smoke test before being trusted.

## 📄 Resume Processing Pipeline — Built, Runs on the Fake Provider

Submitting a job application now triggers, fire-and-forget: CV → text extraction
(`services/resume/textExtraction.js`, real PDF parsing via `pdf-parse`; `.doc`/`.docx`
are a documented, not-yet-implemented gap) → `AIService.extractResumeProfile` →
`CandidateProfile` persisted (one profile per user, overwritten and version-bumped on
each new resume, never duplicated). `JobApplication.resumeProcessingStatus`
(`pending`/`processing`/`completed`/`failed`) reports the outcome.

**This is real, working, tested infrastructure - but the extracted candidate data is
only as good as the active AI provider**, which is the fake one until `OPENAI_API_KEY`
is set. No HTTP endpoint reads `CandidateProfile` or extracted resume text yet.

## 🏢 Job Intelligence Pipeline — Built, Runs on the Fake Provider

Creating a job (and updating one's `description`) triggers, fire-and-forget:
`Job.title` + `description` → `AIService.extractJobProfile` → `JobProfileModel`
persisted (one profile per job, overwritten and version-bumped on reprocessing, never
duplicated). `Job.intelligenceProcessingStatus`
(`pending`/`processing`/`completed`/`failed`) reports the outcome; a client cannot set
this field directly (stripped from update payloads, same protection as `createdBy`).

Deliberately does **not** duplicate `Job`'s own reliable employer-entered fields
(`jobLocation`, `workMode`, `jobType`, `salaryRange`) - `JobProfile` only holds signal
AI-inferred from free-text `description`: normalized/aliased skills (shared alias table
with the resume pipeline, `utils/normalization.js`), inferred seniority, domains, and a
short responsibilities summary. Updating a job's description resets processing to
"pending" and reprocesses - a stale `JobProfile` is never silently treated as current.

Same caveat as the resume pipeline: real quality depends on `OPENAI_API_KEY` being set.
No standalone endpoint reads `JobProfile` directly, but the matching engine below reads
it internally.

## 🎯 Hybrid Job Matching Engine — Deterministic, No AI Calls

`services/matching/` computes a 0–100 match score between a candidate and a job from
structured data only - **no LLM, no external API call anywhere in this module itself**
(the semantic dimension reads an already-computed embedding similarity from Module F; it
does not call an AI provider directly). Seven independent matchers (required skills,
preferred skills, experience, seniority, domain, location/work-mode preference, and
semantic similarity) each score their own dimension; a weighted aggregator combines them,
excluding (not penalizing) any dimension with no data to judge. Every result is stamped
with `matchingAlgorithmVersion`, `candidateProfileVersion`, and `jobProfileVersion` so a
score is always traceable to the exact profiles and algorithm that produced it.

- `GET /api/v1/jobs/:jobId/match` — the authenticated talent's own match against a job.
  Always uses the caller's session identity; never accepts a candidate id, so there is
  no IDOR surface by construction.
- `GET /api/v1/applications/job/:jobId` (existing employer endpoint) now annotates each
  applicant with their `match` object.
- `GET /api/v1/jobs/:jobId/match/explanation` and
  `GET /api/v1/applications/:jobId/:applicantId/match/explanation` (Module G) turn this
  same evidence into a structured "why you match" explanation - see the Module G section
  above.
- Computed on demand, not persisted — see `TASKS.md` for the reasoning. A missing or
  still-processing `CandidateProfile`/`JobProfile` never errors; it's reported via
  `candidateProfileStatus`/`jobProfileStatus` alongside a best-effort score.

## 🔮 Roadmap — Planned, NOT Yet Implemented

The following are intentionally **not** built yet (as of Module H). They are listed here
so the docs never imply more than the codebase actually does:

- **Education gap analysis** — evaluated in Module H and deliberately deferred:
  `CandidateProfile.education` is structured (`{degree, field, institution}`) while
  `JobProfile.education` is free-text AI-extracted strings, with no existing degree-
  ranking/equivalency model anywhere in Module E to compare them against. See
  `MODULE_H_REPORT.md`'s Limitations.
- **Aggregated/cross-job skill-gap analysis** ("which skills are most in-demand across
  every job I might be a fit for") — Module H is scoped to one candidate vs. one job;
  the spec for this feature explicitly deferred the aggregate case to a future module.
- **Score simulation** ("if you learned X, your score would become Y") — Module H's
  `impact` field is a qualitative label (high/medium/low) derived from the same
  dimension-weight/severity evidence as `priority`, not a simulated post-fix score.
- **Course/learning-platform recommendations** (Udemy, Coursera, YouTube, etc.) — Module
  H's `recommendedAction` is a generic, evidence-based action type (e.g.
  `skill_development`), never an external content recommendation.
- **LLM-generated natural-language explanations** — Module G's summary and Module H's
  roadmap message are both deterministic and template-based, not LLM-written; wiring an
  LLM to *reword* (never recalculate) the existing structured output remains a possible,
  optional future enhancement.
- **Personalized job recommendations, resume optimization, career analytics**
- **Organization analytics** — `getOrganizationAnalytics` was removed as dead code
  (see `MISSING_BACKEND_FEATURES.md`); no replacement has been built
- **Notification preferences / digests** — in-app real-time notifications exist
  (`models/NotificationModel.js`, Socket.io), but there is no per-user preference control
  or email digest yet

Semantic search, embeddings-based matching, and vector similarity are implemented (see
Module F above) - do not treat this roadmap as suggesting otherwise. Real-time messaging
and monetization/subscriptions remain fully unbuilt.

---

*Documentation last reviewed as part of the P0/P1/P2 backend hardening pass.*
