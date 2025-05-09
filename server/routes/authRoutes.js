import express from "express";
const router = express.Router();

import { register, login, updateUser,logout,showCurrentUser } from "../controllers/authController.js";

import authenticateUser from "../middlewares/auth.js";
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/updateUser").patch(authenticateUser, updateUser);
router.route("/showCurrentUser").get(authenticateUser,showCurrentUser);

export default router;
