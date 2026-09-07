import Token from "../models/Token.js";
import { isTokenValid } from "./jwt.js";

/**
 * Revokes every valid session (Token doc) for a user - used by account-wide security
 * events (password reset, account deletion, 2FA disable). Pass `exceptTokenId` to keep
 * the session making the request alive (e.g. changing your password shouldn't log
 * yourself out, only every *other* device).
 */
const revokeAllSessionsExcept = async (userId, exceptTokenId = null) => {
  const filter = { user: userId, isValid: true };
  if (exceptTokenId) filter._id = { $ne: exceptTokenId };
  await Token.updateMany(filter, { isValid: false });
};

/**
 * Best-effort: decodes the requester's own refresh-token cookie to find which Token
 * document is the CURRENT session, so an account-wide revoke can exclude it and a
 * sessions list can flag it. Returns null (never throws) if the cookie is missing,
 * expired, or invalid - callers should treat that as "no session identifiable", not
 * an error, since access-token-only requests legitimately don't always carry it.
 */
const getCurrentTokenId = (req) => {
  const refreshTokenCookie = req.signedCookies?.refreshToken;
  if (!refreshTokenCookie) return null;
  try {
    const payload = isTokenValid(refreshTokenCookie, process.env.JWT_REFRESH_SECRET);
    return payload.tokenId || null;
  } catch (error) {
    return null;
  }
};

export default revokeAllSessionsExcept;
export { getCurrentTokenId };
