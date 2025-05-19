import express from "express";
const router = express.Router();
import { getJobApplications,updateApplicationStatus } from "../controllers/jobApplicationController.js";
import { authorizePermissions } from "../middlewares/permissions.js";

router
  .route("/job/:jobId")
  .get(authorizePermissions("employer"), getJobApplications);

router
  .route("/:jobId/:applicantId/status")
  .patch(authorizePermissions("employer"), updateApplicationStatus);


export default router;
