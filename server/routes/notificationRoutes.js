import { Router } from "express";
import { getNotifications, markRead, markAllRead } from "../controllers/notificationController.js";

const router = Router();

router.get("/", getNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

export default router;
