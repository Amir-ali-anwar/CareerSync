import express from "express";
const router = express.Router();

import { getSessions, revokeSession, revokeOtherSessions } from "../controllers/sessionController.js";
import authenticateUser from "../middlewares/auth.js";

router.route("/sessions").get(authenticateUser, getSessions).delete(authenticateUser, revokeOtherSessions);
router.route("/sessions/:id").delete(authenticateUser, revokeSession);

export default router;
