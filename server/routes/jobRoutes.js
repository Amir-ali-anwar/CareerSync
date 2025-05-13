import { Router } from "express";
import {authorizePermissions} from "../middlewares/permissions.js";
const router = Router();

import { createJob,deleteJob,getAllJobs } from "../controllers/jobController.js";

router.route("/").post(authorizePermissions('employer'),createJob);
router.route("/:id").post(authorizePermissions('employer'),deleteJob);
router.route("/all-jobs").get(authorizePermissions('employer'),getAllJobs);
export default router;
