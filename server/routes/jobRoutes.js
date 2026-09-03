import { Router } from "express";
import {authorizePermissions} from "../middlewares/permissions.js";
import uploadCV from '../middlewares/fileuploader.js'
import { jobCreationLimiter, applyForJobLimiter } from "../middlewares/rateLimiter.js";
const router = Router();

import { createJob, deleteJob, getAllJobs, getJob, updateJob, applyForJob, closeJob, searchJobs } from "../controllers/jobController.js";
import { getJobMatch } from "../controllers/matchController.js";

// Talent: browse all open jobs
router.route('/search').get(authorizePermissions('talent'), searchJobs);

// Talent: this job's match score against the caller's own CandidateProfile
router.get('/:jobId/match', authorizePermissions('talent'), getJobMatch);

// Talent: apply for a job
router
  .route('/applyForJob/:id')
  .post(authorizePermissions('talent'), applyForJobLimiter, uploadCV, applyForJob);

// Employer: manage own jobs
router
  .route("/")
  .post(authorizePermissions('employer'), jobCreationLimiter, createJob)
  .get(authorizePermissions('employer'), getAllJobs);

router
  .route("/:id")
  .get(authorizePermissions('employer'), getJob)
  .patch(authorizePermissions('employer'), updateJob)
  .delete(authorizePermissions('employer'), deleteJob);

router.patch('/:jobId/close', authorizePermissions('employer'), closeJob);

export default router;
