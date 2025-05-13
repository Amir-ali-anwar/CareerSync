import { Router } from "express";
import permissions from "../middlewares/permissions.js";
const router = Router();

import { createJob } from "../controllers/jobController.js";

router.route("/").post(permissions('employer'),createJob);

export default router;
