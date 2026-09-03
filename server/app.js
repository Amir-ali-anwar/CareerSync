import express from "express";
import morgan from "morgan";
import cors from "cors";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import notFoundMiddleware from "./middlewares/not-found.js";
import errorHandlerMiddleware from "./middlewares/error-handler.js";
import authenticateUser from './middlewares/auth.js'
import cookieParser from "cookie-parser";
import 'express-async-errors';
import authRoutes from "./routes/authRoutes.js";
import JobRoutes from './routes/jobRoutes.js'
import GetJobApplication from './routes/jobApplicationRoutes.js'
import talentRoutes from './routes/talentRoutes.js'
import organizationRoutes from './routes/OrganizationRoutes.js'
import { swaggerUi, specs } from './config/swagger.js';
import { globalLimiter } from './middlewares/rateLimiter.js';
import requestId from './middlewares/requestId.js';
import redactUrl from './utils/redactUrl.js';

const app = express();

// Liveness/readiness probes are registered before body parsing, cookies, rate limiting,
// the request-id middleware, and access logging - orchestrators poll these every few
// seconds, so they stay cheap and don't spam the structured access log or burn rate-limit
// budget. Neither response carries an X-Request-Id header; that's intentional here.
// /healthz: process is up and can respond - never touches Mongo.
app.get('/healthz', (req, res) => {
  res.status(StatusCodes.OK).json({ status: 'ok' });
});
// /readyz: process is up AND its dependencies (currently just MongoDB) are usable.
app.get('/readyz', (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1; // 1 = connected
  if (!isDbReady) {
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ status: 'error' });
  }
  res.status(StatusCodes.OK).json({ status: 'ok' });
});

app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET));
// Every request gets a server-generated correlation id, echoed back as X-Request-Id
// and included in both access log lines and error responses.
app.use(requestId);
// Structured (JSON-lines) access log, replacing the old plain-text "tiny" format, with
// sensitive query-string values (verification tokens, etc.) redacted before logging.
app.use(
  morgan((tokens, req, res) =>
    JSON.stringify({
      level: 'info',
      time: new Date().toISOString(),
      requestId: req.id,
      method: tokens.method(req, res),
      url: redactUrl(tokens.url(req, res)),
      status: Number(tokens.status(req, res)),
      responseTimeMs: Number(tokens['response-time'](req, res)),
    })
  )
);
// Baseline ceiling for every request; endpoints with sharper abuse potential
// (login, job applications, CSV export, ...) layer a stricter limiter on top.
app.use(globalLimiter);

// NOTE: uploaded CVs are intentionally NOT served via a public express.static mount -
// they contain applicant PII. Access goes through the authenticated, ownership-checked
// GET /api/v1/applications/:id/cv route instead (see controllers/jobApplicationController.js).

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "CareerSync API Documentation"
}));

// routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/jobs", authenticateUser, JobRoutes);
app.use("/api/v1/applications", authenticateUser, GetJobApplication);
app.use("/api/v1/talents", authenticateUser, talentRoutes);
app.use("/api/v1/organization", organizationRoutes);

// middlewares
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
