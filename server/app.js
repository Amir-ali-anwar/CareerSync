import express from "express";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import connectDB from "./db/connect.js";
import notFoundMiddleware from "./middleware/not-found.js";
import errorHandlerMiddleware from "./middleware/error-handler.js";
import auth from "./middleware/auth.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();
app.use(express.json());

// routes
app.use("/api/v1/auth", authRoutes);

// middlewares
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const PORT = process.env.port || 4000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL);
    app.listen(PORT, () => {
      console.log(`server listening on the ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};
start();
