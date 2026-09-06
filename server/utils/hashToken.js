import crypto from "crypto";

// One-way hash for opaque bearer secrets (refresh tokens) before they touch the DB,
// so a database compromise alone never yields a usable credential.
const hashToken = (rawToken) =>
  crypto.createHash("sha256").update(rawToken).digest("hex");

export default hashToken;
