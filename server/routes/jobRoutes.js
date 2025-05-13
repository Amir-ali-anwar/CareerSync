import { Router } from "express";
import {authorizePermissions} from "../middlewares/permissions.js";
const router = Router();

import { createJob, deleteJob, getAllJobs, getJob, updateJob } from "../controllers/jobController.js";

router
  .route("/")
  .post(authorizePermissions('employer'), createJob)
  .get(authorizePermissions('employer'), getAllJobs);

router
  .route("/:id")
  .get(authorizePermissions('employer'), getJob)
  .patch(authorizePermissions('employer'), updateJob)
  .delete(authorizePermissions('employer'), deleteJob);
export default router;
