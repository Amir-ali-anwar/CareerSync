import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./db/connect.js";

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

const start = async () => {
  try {
    const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI;
    await connectDB(mongoUri);
    app.listen(PORT, () => {
      console.log(`server listening on the ${PORT}`);
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
start();
