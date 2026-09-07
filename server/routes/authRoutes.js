import express from "express";
const router = express.Router();

import { register, login, updateUser,logout,showCurrentUser,verifyEmail,updateUserPassword,resendVerificationToken,refreshUserToken,forgotPassword,resetPassword,deleteAccount } from "../controllers/authController.js";
import { googleAuth, googleCompleteRegistration } from "../controllers/oauthController.js";
import { loginLimiter, registerLimiter, resendVerificationLimiter, forgotPasswordLimiter, resetPasswordLimiter, verifyEmailLimiter, googleAuthLimiter } from "../middlewares/rateLimiter.js";  // Import the rate limiters

import authenticateUser from "../middlewares/auth.js";
router.route("/register").post(registerLimiter,register);
router.route("/login").post(loginLimiter,login);
router.route("/logout").get(logout);
// A 6-digit OTP typed in by the user, not a clicked link - POST, not GET.
router.route("/verify-Email").post(verifyEmailLimiter, verifyEmail);
router.route("/refresh-token").post(refreshUserToken);
router.route("/updateUser").patch(authenticateUser, updateUser);
router.route("/showCurrentUser").get(authenticateUser,showCurrentUser);
router.route("/updateUserPassword").patch(authenticateUser,updateUserPassword);
router.post("/resend-verification",resendVerificationLimiter, resendVerificationToken);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPasswordLimiter, resetPassword);
router.delete("/me", authenticateUser, deleteAccount);
router.post("/google", googleAuthLimiter, googleAuth);
router.post("/google/complete", googleAuthLimiter, googleCompleteRegistration);


export default router;
