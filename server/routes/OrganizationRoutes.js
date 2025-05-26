import { Router } from "express";
import { authorizePermissions } from "../middlewares/permissions.js";
import uploadCV from "../middlewares/fileuploader.js";
const router = Router();

import { createOrganization,getAllOrganizations } from "../controllers/organizationController.js";


router
  .route("/")
  .post(authorizePermissions('employer'), createOrganization)

router
  .route("/")
  .get(authorizePermissions('employer'), getAllOrganizations)

export default router;