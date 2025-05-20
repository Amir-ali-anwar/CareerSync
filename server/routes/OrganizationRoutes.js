import { Router } from "express";
import { authorizePermissions } from "../middlewares/permissions.js";
import uploadCV from "../middlewares/fileuploader.js";
const router = Router();

import { createOrganization,getAllOrganizations } from "../controllers/organizationController.js";


router
  .route("/")
  .post(authorizePermissions('employer'), createOrganization)


export default router;