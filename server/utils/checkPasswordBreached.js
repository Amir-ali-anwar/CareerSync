import crypto from "crypto";
import logger from "./logger.js";

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const REQUEST_TIMEOUT_MS = 3000;

/**
 * Checks a password against the "Have I Been Pwned" Pwned Passwords list using
 * k-anonymity: only the first 5 characters of the password's SHA-1 hash ever leave
 * this server, never the password itself or its full hash.
 *
 * Fails OPEN (returns false = "not known to be breached") on any network/timeout
 * error - registration/password changes must never depend on a third party's uptime.
 */
const isPasswordBreached = async (password) => {
  try {
    const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${HIBP_RANGE_URL}${prefix}`, { signal: controller.signal });
      if (!response.ok) return false;
      const body = await response.text();
      return body.split("\n").some((line) => line.split(":")[0].trim() === suffix);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    logger.error("password_breach_check_failed", { message: error.message });
    return false;
  }
};

export default isPasswordBreached;
