import { Router } from "express";
import { authorizePermissions } from "../middlewares/permissions.js";

import {
  getAllTalents,
  getTalentById,
  exportApplications,getMyApplications
} from "../controllers/talentController.js";
const router = Router();

router.route("/").get(authorizePermissions("employer"), getAllTalents);
router.get(
  "/export-applications",
  authorizePermissions("employer"),
  exportApplications
);
router.route("/:talentId").get(authorizePermissions("employer"), getTalentById);

export default router;
