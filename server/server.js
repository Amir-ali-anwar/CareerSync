import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./db/connect.js";
import logger from "./utils/logger.js";

const REQUIRED_ENV_VARS = ["JWT_SECRET", "JWT_REFRESH_SECRET"];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(
    `FATAL: Missing required environment variable(s): ${missingEnvVars.join(", ")}`
  );
  process.exit(1);
}

// In production, CORS/cookie behavior and outgoing verification-email links depend on
// knowing the real frontend origin - silently falling back to localhost would either
// lock out the real client or leak verification links pointing at a dev URL.
if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL && !process.env.FRONTEND_URL) {
  console.error(
    "FATAL: NODE_ENV=production requires CLIENT_URL (or FRONTEND_URL) to be set."
  );
  process.exit(1);
}

const PORT = process.env.PORT || process.env.port || 4000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

// Docker/Kubernetes/most orchestrators send SIGTERM (not SIGKILL) to stop a container,
// expecting the process to stop accepting new work, finish in-flight requests, and exit
// on its own. Without this, in-flight requests get dropped mid-response and the Mongo
// connection is torn down uncleanly on every deploy/restart.
const registerGracefulShutdown = (httpServer) => {
  let shuttingDown = false;

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("shutdown_started", { signal });

    const forceExitTimer = setTimeout(() => {
      logger.error("shutdown_forced", { reason: "timeout exceeded, in-flight requests may have been dropped" });
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    httpServer.close(async () => {
      try {
        await mongoose.connection.close();
        logger.info("shutdown_complete", {});
        clearTimeout(forceExitTimer);
        process.exit(0);
      } catch (error) {
        logger.error("shutdown_error", { message: error.message });
        clearTimeout(forceExitTimer);
        process.exit(1);
      }
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

const start = async () => {
  try {
    const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI;
    await connectDB(mongoUri);
    const httpServer = app.listen(PORT, () => {
      console.log(`server listening on the ${PORT}`);
    });
    registerGracefulShutdown(httpServer);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
start();
