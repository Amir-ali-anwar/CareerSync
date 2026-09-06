// Strips sensitive query-string values (e.g. GET /auth/verify-Email?verificationToken=...)
// out of a URL before it's ever written to a log line.
const SENSITIVE_QUERY_PARAMS = ["verificationToken", "token", "password", "refreshToken"];

const redactUrl = (rawUrl) => {
  const [pathPart, queryPart] = rawUrl.split("?");
  if (!queryPart) return rawUrl;
  try {
    const params = new URLSearchParams(queryPart);
    SENSITIVE_QUERY_PARAMS.forEach((key) => {
      if (params.has(key)) params.set(key, "[REDACTED]");
    });
    return `${pathPart}?${params.toString()}`;
  } catch {
    return pathPart;
  }
};

export default redactUrl;
