import { Router } from "express";
import {authorizePermissions} from "../middlewares/permissions.js";
import uploadCV from '../middlewares/fileuploader.js'
const router = Router();

import { createJob, deleteJob, getAllJobs, getJob, updateJob,applyForJob,myApplications } from "../controllers/jobController.js";

router
  .route("/")
  .post(authorizePermissions('employer'), createJob)
  .get(authorizePermissions('employer'), getAllJobs);

router.route('/applyForJob/:id').post(authorizePermissions('talent'), uploadCV, applyForJob);

router.route('/myApplications').get(authorizePermissions('talent'), myApplications);
router
  .route("/:id")
  .get(authorizePermissions('employer'), getJob)
  .patch(authorizePermissions('employer'), updateJob)
  .delete(authorizePermissions('employer'), deleteJob);
export default router;
