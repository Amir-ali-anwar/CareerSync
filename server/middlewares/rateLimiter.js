import rateLimit from "express-rate-limit";

// 🔐 Login: Limit to 5 attempts per minute
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { msg: "Too many login attempts. Try again in 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 📝 Register: Limit to 10 attempts per hour
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { msg: "Too many registration attempts. Try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 📧 Resend Verification: Limit to 3 attempts per hour
export const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { msg: "Too many verification resend attempts. Try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
});
