import express from "express";
const router = express.Router();

import { register, login, updateUser,logout,showCurrentUser,verifyEmail,updateUserPassword,resendVerificationToken } from "../controllers/authController.js";

import authenticateUser from "../middlewares/auth.js";
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/verify-Email").get(verifyEmail);
router.route("/updateUser").patch(authenticateUser, updateUser);
router.route("/showCurrentUser").get(authenticateUser,showCurrentUser);
router.route("/updateUserPassword").patch(authenticateUser,updateUserPassword);
router.post("/resend-verification", resendVerificationToken);


export default router;
