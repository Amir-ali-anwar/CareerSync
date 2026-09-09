import NotificationModel from "../../models/NotificationModel.js";
import { emitToUser } from "../realtime/socket.js";
import logger from "../../utils/logger.js";

/**
 * Writes a notification and pushes it live over socket.io. Unlike the email/AI
 * fire-and-forget helpers elsewhere (dispatchVerificationEmail, triggerResumeProcessing),
 * this is awaited at the call site - it's a single indexed Mongo insert, not a slow or
 * unreliable third-party call, so there's no latency reason to detach it from the
 * response. It still must never fail the action that triggered it (a notification
 * hiccup shouldn't block someone applying for a job), so failures are caught and logged
 * here rather than thrown.
 */
export const createNotification = async ({ user, type, title, message, link, metadata }) => {
  try {
    const notification = await NotificationModel.create({ user, type, title, message, link, metadata });
    emitToUser(user, "notification", notification.toObject());
    return notification;
  } catch (error) {
    logger.error("notification_create_failed", { type, userId: String(user), message: error.message });
    return null;
  }
};

export const listNotifications = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [notifications, totalNotifications, unreadCount] = await Promise.all([
    NotificationModel.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    NotificationModel.countDocuments({ user: userId }),
    NotificationModel.countDocuments({ user: userId, read: false }),
  ]);
  return { notifications, totalNotifications, unreadCount, page, limit };
};

export const markNotificationRead = async (userId, notificationId) =>
  NotificationModel.findOneAndUpdate({ _id: notificationId, user: userId }, { read: true }, { new: true });

export const markAllNotificationsRead = async (userId) =>
  NotificationModel.updateMany({ user: userId, read: false }, { read: true });
