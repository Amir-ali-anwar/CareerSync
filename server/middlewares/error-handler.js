import { StatusCodes } from "http-status-codes";
import logger from "../utils/logger.js";
import redactUrl from "../utils/redactUrl.js";

const errorHandlerMiddleware = (err, req, res, next) => {
  const defaultError = {
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    msg: err.message || "something went wrong try again later",
  };
  if (err.name === "ValidationError") {
    defaultError.statusCode = StatusCodes.BAD_REQUEST;
    defaultError.msg = Object.values(err.errors)
      .map((item) => item.message)
      .join(",");
  }
  if (err.code && err.code === 11000) {
    defaultError.statusCode = StatusCodes.BAD_REQUEST;
    defaultError.msg = ` ${Object.keys(err.keyValue)} field must be unique `;
  }
  if (err.name === "CastError") {
    defaultError.statusCode = StatusCodes.BAD_REQUEST;
    defaultError.msg = `Invalid ${err.path}: ${err.value}`;
  }

  // Only genuine server-side failures (5xx) get a full diagnostic log with a stack
  // trace - expected client errors (400/401/403/404) are already captured by the
  // access log line and would otherwise drown out real problems with noise. Never
  // logs the request body/headers, so credentials, tokens, or CV contents can't leak.
  if (defaultError.statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
    logger.error("request_error", {
      requestId: req.id,
      method: req.method,
      url: redactUrl(req.originalUrl || req.url),
      statusCode: defaultError.statusCode,
      message: err.message,
      stack: err.stack,
    });
  }

  res
    .status(defaultError.statusCode)
    .json({ msg: defaultError.msg, requestId: req.id });
};
export default errorHandlerMiddleware;
