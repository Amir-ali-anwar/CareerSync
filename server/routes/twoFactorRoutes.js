import express from "express";
const router = express.Router();

import {
  setupTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
  completeTwoFactorLogin,
} from "../controllers/twoFactorController.js";
import { twoFactorLimiter } from "../middlewares/rateLimiter.js";
import authenticateUser from "../middlewares/auth.js";

router.route("/2fa/setup").post(authenticateUser, twoFactorLimiter, setupTwoFactor);
router.route("/2fa/verify-setup").post(authenticateUser, twoFactorLimiter, verifyTwoFactorSetup);
router.route("/2fa/disable").post(authenticateUser, twoFactorLimiter, disableTwoFactor);
router.route("/2fa/login").post(twoFactorLimiter, completeTwoFactorLogin);

export default router;
