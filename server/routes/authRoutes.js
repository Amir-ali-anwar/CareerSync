import express from "express";
const router = express.Router();

import { register, login, updateUser,logout } from "../controllers/authController.js";
import auth from "../middlewares/auth.js";
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/updateUser").patch(auth, updateUser);

export default router;
