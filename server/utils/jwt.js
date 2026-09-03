import jwt from 'jsonwebtoken'

const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '1d';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Minimal "1d"/"15m"/"12h"/"30s" duration parser matching jsonwebtoken's expiresIn format.
const parseDurationMs = (duration, fallbackMs) => {
  if (typeof duration === 'number') return duration * 1000;
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(String(duration).trim());
  if (!match) return fallbackMs;
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return Number(match[1]) * unitMs[match[2]];
};

const ACCESS_TOKEN_MAX_AGE_MS = parseDurationMs(ACCESS_TOKEN_EXPIRY, 24 * 60 * 60 * 1000);
const REFRESH_TOKEN_MAX_AGE_MS = parseDurationMs(REFRESH_TOKEN_EXPIRY, 30 * 24 * 60 * 60 * 1000);

const createJWT = ({ payload, expiresIn, secret = process.env.JWT_SECRET }) => {
  if (!payload) throw new Error("JWT payload is undefined");

  const token = jwt.sign(payload, secret, expiresIn ? { expiresIn } : undefined);
  return token;
};

const isTokenValid = (token, secret = process.env.JWT_SECRET) => jwt.verify(token, secret);

/**
 * Sets the access-token cookie, and - when `refreshTokenSecret` is provided - the
 * refresh-token cookie pair:
 *   - `refreshToken`: a JWT (signed with JWT_REFRESH_SECRET) carrying only the user's
 *     identity, so a leaked access-token secret can't be used to forge a refresh session.
 *   - `refreshTokenSecret`: the raw opaque bearer secret, kept OUT of any JWT payload.
 *     Only its SHA-256 hash is ever persisted (see utils/hashToken.js), so a database
 *     leak alone can never be replayed as a working credential.
 * Omit `refreshTokenSecret` (e.g. on a plain profile update) to leave the caller's
 * existing refresh session untouched.
 */
const attachCookiesToResponse = ({ res, user, refreshTokenSecret }) => {
  const accessTokenJWT = createJWT({
    payload: { user },
    expiresIn: ACCESS_TOKEN_EXPIRY,
    secret: process.env.JWT_SECRET,
  });

  res.cookie('accessToken', accessTokenJWT, {
    httpOnly: true,
    expires: new Date(Date.now() + ACCESS_TOKEN_MAX_AGE_MS),
    secure: process.env.NODE_ENV === 'production',
    signed: true,
  });

  if (refreshTokenSecret) {
    const refreshTokenJWT = createJWT({
      payload: { userId: user.userId },
      expiresIn: REFRESH_TOKEN_EXPIRY,
      secret: process.env.JWT_REFRESH_SECRET,
    });
    res.cookie('refreshToken', refreshTokenJWT, {
      httpOnly: true,
      expires: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
      secure: process.env.NODE_ENV === 'production',
      signed: true,
    });
    res.cookie('refreshTokenSecret', refreshTokenSecret, {
      httpOnly: true,
      expires: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
      secure: process.env.NODE_ENV === 'production',
      signed: true,
    });
  }
};

export {
  createJWT,
  isTokenValid,
  attachCookiesToResponse,
};
