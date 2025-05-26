import { Router } from "express";
import { authorizePermissions } from "../middlewares/permissions.js";
const router = Router();
import { createOrganization,getAllOrganizations,updateOrganization,getAllPublicOrganizations } from "../controllers/organizationController.js";
router
  .route("/")
  .post(authorizePermissions('employer'), createOrganization)
router
  .route("/")
  .get(authorizePermissions('employer'), getAllOrganizations)


  router
  .route("/public")
  .get(getAllPublicOrganizations)
  router
    .route("/:id")
    // .get(authorizePermissions('employer'), getJob)
    .patch(authorizePermissions('employer'), updateOrganization)
    // .delete(authorizePermissions('employer'), deleteJob);

export default router;