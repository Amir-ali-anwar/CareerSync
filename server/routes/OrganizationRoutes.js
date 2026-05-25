import { Router } from "express";
import { authorizePermissions } from "../middlewares/permissions.js";
import authenticateUser from "../middlewares/auth.js";
const router = Router();
import {
  createOrganization,
  getAllOrganizations,
  updateOrganization,
  getAllPublicOrganizations,
  getSinglePublicOrganization,
  deleteOrganization,
  checkIfFollowingOrganization,
  followOrganization, getOrganizationFollowers, getPublicFollowerCount
} from "../controllers/organizationController.js";
router
  .route("/")
  .post(authenticateUser, authorizePermissions("employer"), createOrganization)
  .get(authenticateUser, authorizePermissions("employer"), getAllOrganizations);
router
  .route("/:id/follow")
  .post(authenticateUser, authorizePermissions("talent"), followOrganization);
router.route("/public").get(getAllPublicOrganizations);
router.route("/public-organizations/:id/followers/count").get(getPublicFollowerCount);

router.route("/public/:id").get(getSinglePublicOrganization);
router
  .route("/:id")
  .patch(authenticateUser, authorizePermissions("employer"), updateOrganization)
  .delete(authenticateUser, authorizePermissions("employer"), deleteOrganization)

router
  .route("/:id/followers")
  .get(authenticateUser, authorizePermissions("employer"), getOrganizationFollowers);

router
  .route("/:id/is-following")
  .get(authenticateUser, authorizePermissions("talent"), checkIfFollowingOrganization);


export default router;
