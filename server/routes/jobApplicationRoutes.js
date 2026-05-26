import express from "express";
const router = express.Router();
import { getJobApplications,updateApplicationStatus,withdrawApplication,getMyApplications } from "../controllers/jobApplicationController.js";
import { authorizePermissions } from "../middlewares/permissions.js";



router
  .route("/my")
  .get(authorizePermissions("talent"), getMyApplications);

router
  .route("/job/:jobId")
  .get(authorizePermissions("employer"), getJobApplications);

router
  .route("/:jobId/:applicantId/status")
  .patch(authorizePermissions("employer"), updateApplicationStatus);

router.patch('/:id/withdraw', authorizePermissions('talent'), withdrawApplication);

export default router;
