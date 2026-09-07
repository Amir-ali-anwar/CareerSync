import { Router } from "express";
import { authorizePermissions } from "../middlewares/permissions.js";
import uploadCV from "../middlewares/fileuploader.js";
import { resumeUploadLimiter } from "../middlewares/rateLimiter.js";
import {
  getMyCandidateProfile,
  updateMyCandidateProfile,
  uploadResume,
  getMyMatches,
} from "../controllers/candidateProfileController.js";

const router = Router();

router
  .route("/")
  .get(authorizePermissions("talent"), getMyCandidateProfile)
  .patch(authorizePermissions("talent"), updateMyCandidateProfile);

router.post("/resume", authorizePermissions("talent"), resumeUploadLimiter, uploadCV, uploadResume);

router.get("/matches", authorizePermissions("talent"), getMyMatches);

export default router;
