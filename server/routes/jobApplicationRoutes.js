import express from "express";
const router = express.Router();
import { getJobApplications } from "../controllers/jobApplicationController.js";
import { authorizePermissions } from "../middlewares/permissions.js";

router
  .route("/job/:jobId")
  .get(authorizePermissions("employer"), getJobApplications);

export default router;
