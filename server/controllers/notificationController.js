import { StatusCodes } from "http-status-codes";
import { NotFoundError } from "../errors/index.js";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notifications/notificationService.js";

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: List the current user's notifications, newest first
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 */
export const getNotifications = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const result = await listNotifications(req.user.userId, { page, limit });
  res.status(StatusCodes.OK).json(result);
};

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
export const markRead = async (req, res) => {
  const notification = await markNotificationRead(req.user.userId, req.params.id);
  if (!notification) {
    throw new NotFoundError("Notification not found");
  }
  res.status(StatusCodes.OK).json({ notification });
};

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   patch:
 *     summary: Mark every one of the current user's notifications as read
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
export const markAllRead = async (req, res) => {
  await markAllNotificationsRead(req.user.userId);
  res.status(StatusCodes.OK).json({ msg: "All notifications marked as read" });
};
