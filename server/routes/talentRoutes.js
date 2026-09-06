import { Router } from "express";
import { authorizePermissions } from "../middlewares/permissions.js";
import { csvExportLimiter } from "../middlewares/rateLimiter.js";

import {
  getAllTalents,
  getTalentById,
  exportApplications
} from "../controllers/talentController.js";
const router = Router();

router.route("/").get(authorizePermissions("employer"), getAllTalents);
router.get(
  "/export-applications",
  authorizePermissions("employer"),
  csvExportLimiter,
  exportApplications
);
router.route("/:talentId").get(authorizePermissions("employer"), getTalentById);

export default router;
