import express from "express";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import connectDB from "./db/connect.js";
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
const app = express();
app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET));

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

app.use(morgan("tiny"));
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
  }
};
start();
