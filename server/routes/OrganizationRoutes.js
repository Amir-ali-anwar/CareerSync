import { Router } from "express";
import { authorizePermissions } from "../middlewares/permissions.js";
const router = Router();
import {
  createOrganization,
  getAllOrganizations,
  updateOrganization,
  getAllPublicOrganizations,
  getSinglePublicOrganization,
  deleteOrganization,
  followOrganization,
} from "../controllers/organizationController.js";
router.route("/").post(authorizePermissions("employer"), createOrganization);
router.route("/").get(authorizePermissions("employer"), getAllOrganizations);
router.route("/:id/follow").post(authorizePermissions("talent"), followOrganization);
router.route("/public").get(getAllPublicOrganizations);

router.route("/public/:id").get(getSinglePublicOrganization);
router
  .route("/:id")
  .patch(authorizePermissions("employer"), updateOrganization)
  .delete(authorizePermissions("employer"), deleteOrganization);

export default router;
