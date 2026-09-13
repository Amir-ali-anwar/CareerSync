import rateLimit from "express-rate-limit";

const skipInTest = () => process.env.NODE_ENV === "test";

// 🔐 Login: Limit to 5 attempts per minute
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { msg: "Too many login attempts. Try again in 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// 📝 Register: Limit to 10 attempts per hour
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { msg: "Too many registration attempts. Try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// 📧 Resend Verification: Limit to 3 attempts per hour
export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { msg: "Too many verification resend attempts. Try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// 🌐 General-purpose ceiling applied to every request, so no single endpoint that
// forgot a dedicated limiter is left completely unthrottled.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { msg: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// 📄 Job creation: cheap to spam, expensive to clean up.
export const jobCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: { msg: "Too many job postings created. Try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// 📎 Job applications involve a file upload - throttle harder than plain reads.
export const applyForJobLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { msg: "Too many job applications submitted. Try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// 📊 CSV export runs two unbounded-by-time DB scans - the most abuse-prone read endpoint.
export const csvExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { msg: "Too many export requests. Try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// 🏢 Organization creation: already capped per-user at the application layer
// (MAX_ORGS_PER_USER); this adds a time-based throttle on top.
export const organizationCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { msg: "Too many organizations created. Try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// 📄 Standalone resume upload: same file-upload throttle as applying for a job.
export const resumeUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { msg: "Too many resume uploads. Try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// 🔑 Forgot/reset password: sensitive, low-frequency actions - throttle harder than a
// plain read, similar to registration.
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { msg: "Too many password reset requests. Try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { msg: "Too many password reset attempts. Try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// ✅ Verify email: now a guessable 6-digit code (not a clicked link) - throttle attempts.
export const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { msg: "Too many verification attempts. Try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// 🔑 2FA: guessable 6-digit TOTP codes / backup codes - same throttling reasoning as OTP.
export const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { msg: "Too many two-factor attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// 🔓 Google sign-in: same shape as loginLimiter - throttles token-verification attempts.
export const googleAuthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { msg: "Too many sign-in attempts. Try again in 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// Semantic search: each request embeds the query via a billed OpenAI call - the
// generic globalLimiter alone leaves that cost effectively unmetered per user.
export const semanticSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { msg: "Too many semantic search requests. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// 🤖 Agent execution: a single request can run several matching/skill-gap calls plus
// one billed LLM narrative call - the most expensive single endpoint in the API.
// Throttled harder than semantic search, similar in spirit to csvExportLimiter.
export const agentExecutionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { msg: "Too many career agent requests. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});
