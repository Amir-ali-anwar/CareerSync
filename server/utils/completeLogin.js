import crypto from "crypto";
import Token from "../models/Token.js";
import { attachCookiesToResponse } from "./jwt.js";
import createTokenUser from "./createTokenUser.js";
import hashToken from "./hashToken.js";

/**
 * Issues a brand-new session for a user who has already fully authenticated
 * (password + 2FA if enabled, or a verified Google sign-in): creates the session's
 * Token document and attaches the access/refresh cookies. Shared by the normal
 * login tail, the 2FA-login completion endpoint, and Google sign-in/onboarding, so
 * "what a successful login actually does" only lives in one place.
 */
const issueSession = async ({ res, user, ip, userAgent }) => {
  const tokenUser = createTokenUser(user);
  const refreshTokenSecret = crypto.randomBytes(40).toString("hex");

  const tokenDoc = await Token.create({
    refreshToken: hashToken(refreshTokenSecret),
    ip: ip || "unknown",
    userAgent: userAgent || "unknown",
    isValid: true,
    user: user._id,
  });

  attachCookiesToResponse({ res, user: tokenUser, refreshTokenSecret, tokenId: tokenDoc._id });

  return tokenUser;
};

export default issueSession;
