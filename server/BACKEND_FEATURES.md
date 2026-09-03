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
structured data only - **no LLM, no embeddings, no external API call anywhere in this
module**. Seven independent matchers (required skills, preferred skills, experience,
seniority, domain, location/work-mode preference, and a semantic stub reserved for a
future phase) each score their own dimension; a weighted aggregator combines them,
excluding (not penalizing) any dimension with no data to judge. Every result is stamped
with `matchingAlgorithmVersion`, `candidateProfileVersion`, and `jobProfileVersion` so a
score is always traceable to the exact profiles and algorithm that produced it.

- `GET /api/v1/jobs/:jobId/match` — the authenticated talent's own match against a job.
  Always uses the caller's session identity; never accepts a candidate id, so there is
  no IDOR surface by construction.
- `GET /api/v1/applications/job/:jobId` (existing employer endpoint) now annotates each
  applicant with their `match` object.
- Computed on demand, not persisted — see `TASKS.md` for the reasoning. A missing or
  still-processing `CandidateProfile`/`JobProfile` never errors; it's reported via
  `candidateProfileStatus`/`jobProfileStatus` alongside a best-effort score.

## 🔮 Roadmap — Planned, NOT Yet Implemented

The following are intentionally **not** built yet. They are listed here so the docs
never imply more than the codebase actually does:

- **Semantic search / embeddings-based matching** — `services/matching/matchers/semanticMatcher.js` is a prepared stub, not an implementation
- **Skill-gap analysis / recommendations**
- **"Why you match" LLM explanations** (the matching engine already produces the structured evidence this would read from)
- **Vector search** — no vector database or index is provisioned anywhere
- **Notifications, messaging, organization analytics**

`models/JobsModel.js`, `models/JobProfileModel.js`, and `models/CandidateProfileModel.js`
now carry the structured fields this future matching work will read from, and
`services/ai/` provides the (currently fake-backed) provider abstraction it will call -
but no matching/search/recommendation logic exists yet. Do not treat either as evidence
that AI matching/search exists today.

Also not implemented: real-time messaging, a notification system beyond transactional
verification email, an analytics dashboard, and monetization/subscriptions. All of these
are tracked as future phases, not current functionality.

---

*Documentation last reviewed as part of the P0/P1/P2 backend hardening pass.*
