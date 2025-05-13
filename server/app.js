import express from "express";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import connectDB from "./db/connect.js";
import notFoundMiddleware from "./middlewares/not-found.js";
import errorHandlerMiddleware from "./middlewares/error-handler.js";
import cookieParser from "cookie-parser";
import 'express-async-errors'; 
import authRoutes from "./routes/authRoutes.js";
import JobRoutes from './routes/jobRoutes.js'
const app = express();
app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET));
// routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/jobs", JobRoutes);

// middlewares
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

app.use(morgan("tiny"));
const PORT = process.env.port || 4000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(PORT, () => {
      console.log(`server listening on the ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};
start();
