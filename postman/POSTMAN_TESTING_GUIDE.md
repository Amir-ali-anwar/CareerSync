# Career Sync — Postman Testing Guide

This collection was generated directly from the `server/` source code (routes, controllers, models, middleware) — see `POSTMAN_API_INVENTORY.md` for the full endpoint audit. It is a manual-testing aid, not a CI test suite.

## 1. Import the collection

Postman → **Import** → select `career-sync.postman_collection.json`. You'll see one collection, **Career Sync API**, with 8 folders and 73 requests.

## 2. Import the environment (optional)

Postman → **Import** → select `career-sync.postman_environment.json`, then select **Career Sync - Local Dev** from the environment dropdown (top-right). This isn't strictly required — every variable also has a default baked into the collection itself (`variable` array) — but selecting it makes the seed emails/passwords easier to see and edit, and keeps secrets out of the collection file if you ever fork it.

## 3. Start the backend

```bash
cd server
npm install
cp .env.example .env
# edit .env: set JWT_SECRET and JWT_REFRESH_SECRET (both required, must differ) — e.g.
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# MONGO_URL defaults to mongodb://localhost:27017/careersync — have MongoDB running locally,
# or point it at your own instance.
npm run dev
```

You should see `MongoDB connected...` and `server listening on the 4000` in the console. Leave this terminal visible — you'll need it in step 6.

## 4. Configure `baseUrl`

Defaults to `http://localhost:4000`, matching `PORT=4000` in `.env.example` and the dev server entry in `server/config/swagger.js`. If your server runs elsewhere, edit the `baseUrl` collection (or environment) variable — nothing in the collection hardcodes the host.

## 5. How authentication actually works here (read this before running anything)

Unlike a typical Bearer-token API, Career Sync issues **httpOnly, signed cookies**, not a token string in the JSON response:

- `POST /api/v1/auth/login` → response body is just `{ "tokenUser": { "name", "userId", "role" } }`. The actual credentials (`accessToken`, `refreshToken`, `refreshTokenSecret`) arrive as `Set-Cookie` headers.
- Postman's built-in cookie jar stores these automatically and resends them on every later request to the same `baseUrl` — you don't need to copy anything into a header yourself.
- **The cookie jar holds exactly one active session per domain.** If you log in as the employer, every subsequent request runs as that employer — including ones you meant to run as talent — until you log in again as talent. This is why every folder in the collection opens with the "Login - Talent" / "Login - Employer" request(s) it needs, even if a previous folder already logged in as that role. Always run a folder's login step(s) before its other requests.
- To inspect the cookies Postman is holding for `localhost:4000`, use Postman's **Cookies** manager (below the Send button, or Settings → Cookies).

## 6. Register and verify (once per account)

Run, in order, from the **Authentication** folder:

1. **Register - Talent (Valid)**, **Register - Talent 2 (Valid, for IDOR tests)**, **Register - Employer (Valid)** — each returns 201 with just a `msg`, no token. Accounts start `isVerified: false`.
2. Switch to the terminal running `npm run dev`. In dev, SMTP falls back to an **Ethereal** test inbox (see `.env.example` / `server/utils/sendVerificationEmail.js`), and the server logs a line like:
   ```
   Preview URL: https://ethereal.email/message/XXXXXXXXXXXX
   ```
   for each registration. Open that URL in a browser to view the fake email, then find the verification link inside it — it looks like `http://localhost:3000/user/verify-email?token=<TOKEN>&email=<EMAIL>`.
3. Copy `<TOKEN>` into the matching collection variable: `talentVerificationToken`, `talent2VerificationToken`, or `employerVerificationToken`.
4. Run the matching **Verify Email - ...** request. Expect `200 { "msg": "Email Verified" }`.
5. Tokens expire after 10 minutes — if yours expires, run **Resend Verification Token** and repeat from step 2.

There is intentionally no API endpoint that returns the token directly (that would let anyone verify anyone's account) — this manual hop is a real characteristic of the backend, not a gap in the collection.

**Re-running the collection later?** `email` is unique in MongoDB. Either change `talentEmail`/`talent2Email`/`employerEmail` to fresh values before your next full run, or drop the affected documents from the `users` collection in your dev database.

## 7. How tokens/IDs are automatically stored

Test scripts on key requests capture values into **collection variables** (visible/editable under the collection's Variables tab):

| Request | Captures |
|---|---|
| Login - Talent / Talent 2 / Employer | `talentUserId` / — / `employerUserId` (from `tokenUser.userId`) + asserts the `accessToken` cookie was set |
| Create Organization (Valid) | `organizationId` |
| Create Job (Valid) | `jobId` |
| Apply for Job (Valid, multipart CV upload) | `applicationId` |

Because sessions live in cookies, not JSON, these scripts read `pm.response.json().tokenUser...` for identity and `pm.cookies.has('accessToken')` to confirm the session, rather than pulling a token string out of the body.

## 8. Recommended request execution order

Run folders top to bottom; within a folder, top to bottom:

1. **Health** — sanity check the server is up.
2. **Authentication** — register + verify both talents and the employer (steps above), then exercise login/profile/logout.
3. **Organizations** — create + manage an organization as the employer, then switch to talent to follow it.
4. **Jobs - Employer** — create the job used by every later folder (`jobId`).
5. **Jobs - Talent** — search, check the match score, then **apply** (multipart — see step 9), capturing `applicationId`.
6. **Job Applications** — talent views/withdraws/downloads; employer reviews, scores, and updates status; a second talent is used to prove CV access is locked down.
7. **Talents (Employer)** — employer-side applicant views + CSV export.
8. **Cleanup (Optional, Run Last)** — closes/deletes the job and organization created above. Deliberately isolated so running it early doesn't break the folders that depend on `jobId`/`organizationId`.

You can also run any single folder in isolation as long as you first complete step 6 (register/verify) once — every folder re-logs-in as the role(s) it needs.

## 9. Testing file uploads

**Apply for Job (Valid, multipart CV upload)** (Jobs - Talent folder) is the only upload endpoint. Before sending it:

1. Open the request → **Body** tab (already set to `form-data`).
2. On the `cv` row, click **Select Files** and choose a local PDF/DOC/DOCX under 5MB.
3. A ready-made sample already exists in the repo: `server/tests/fixtures/valid-sample.pdf`.

Constraints enforced server-side (`server/middlewares/fileuploader.js`): field name must be exactly `cv`, MIME type must be PDF/DOC/DOCX, size ≤ 5MB. Wrong type/size → 400 with a specific message; missing file entirely → 400 `"Please attach your cv"`.

To download a CV back out (**Download Application CV** requests), use Postman's **Send and Download** (the small arrow next to Send) so the binary PDF is saved to disk instead of rendered as text.

## 10. Testing matching

**Get Job Match Score** (Jobs - Talent) computes a deterministic, versioned match between the caller's own CandidateProfile and a job — run it once **before** applying (candidate profile doesn't exist yet → `candidateProfileStatus: "not_found"`, score is best-effort from job data alone) and again **after** applying, once the async resume-processing pipeline has had a moment to run (`candidateProfileStatus` moves pending → processing → completed).

The collection deliberately does **not** assert a specific numeric `matchScore` — the algorithm blends 7 weighted dimensions (`services/matching/matchingService.js`: required skills, preferred skills, experience, seniority, domain, preferences, semantic) and the semantic component depends on whichever AI provider is configured (deterministic fake provider by default in dev/CI per `.env.example`, or real OpenAI output if `OPENAI_API_KEY` is set) — the backend is the only source of truth for the number, per the brief's own instruction not to invent an expected result.

To explore different match situations yourself: create additional jobs (Jobs - Employer > Create Job) with different `requiredSkills`/`requiredExperience`/`workMode`, then re-apply as talent with a CV whose extracted skills you control, and compare the `componentScores` breakdown returned by the match endpoint — that field-by-field breakdown is the more useful signal than the aggregate score for manual QA.

## 11. Testing semantic search

**Jobs - Talent** includes four semantic-search requests: a basic query, one with every supported filter (`workMode`, `jobType`, `threshold`), and two negative cases (`q` too short, `threshold` out of range). Because ranking depends on each job's asynchronously-computed embedding, a job created moments earlier may not yet appear in results — that's expected, not a bug; re-run after giving job-intelligence processing a few seconds.

## 12. Known limitations

- **Verification tokens require a manual copy/paste from the server console** (step 6) — there is no API to fetch them, by design.
- **Match scores and semantic-search rankings are not deterministic across environments** — they depend on the configured AI provider and on background processing having completed by the time you call the endpoint.
- **`CandidateProfile` and `JobProfile` have no direct CRUD API** — they only exist as side effects of applying to a job / creating or editing a job description, so you cannot pre-seed a candidate's skills through Postman; you can only influence them via the CV you upload.
- **Role switching overwrites the active Postman session** (see §5) — running requests out of the documented order (e.g. an employer-only request right after a talent login, without an intervening employer login) will correctly fail with 401/403; that's the real access-control behavior, not a broken request.
- **Rate limits are real** (`server/middlewares/rateLimiter.js`): login (5/min), register (10/hr), resend-verification (3/hr), job creation (30/hr), job applications (20/hr), CSV export (10/hr), organization creation (10/hr). Hammering the collection repeatedly in a short window will start returning 429s — this is expected backend behavior, not a collection defect. Rate limiting is skipped automatically when the server runs with `NODE_ENV=test`.
- **Two Swagger-vs-route path mismatches and one Swagger-vs-route naming mismatch** exist in the source itself (see `POSTMAN_API_INVENTORY.md`) — this collection follows the real, working route in every case and calls out the discrepancy in the affected request's description.
- **No admin role exists** in this codebase, so there are no admin-only requests to include.
- The CSV export and "Get Job Match Score" responses can vary in shape/size depending on how many applications/jobs already exist in your database from prior runs — the saved response *examples* in this collection are illustrative, not exact reproductions of what you'll see.
