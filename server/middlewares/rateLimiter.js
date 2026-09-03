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
