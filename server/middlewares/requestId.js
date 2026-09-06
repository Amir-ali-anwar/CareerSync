import crypto from "crypto";

// Always generate our own id server-side rather than trusting an inbound
// X-Request-Id header, so a caller can't inject arbitrary values into our logs.
const requestId = (req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
};

export default requestId;
