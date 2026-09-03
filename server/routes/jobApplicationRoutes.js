import express from "express";
const router = express.Router();
import { getJobApplications,updateApplicationStatus,withdrawApplication,getMyApplications,getApplicationCV } from "../controllers/jobApplicationController.js";
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

// Both talents (their own CV) and employers (CVs on their own jobs) may hit this -
// ownership is enforced inside the controller rather than by role.
router.get('/:id/cv', getApplicationCV);

export default router;
