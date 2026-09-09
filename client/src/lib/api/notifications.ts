import { apiClient } from "./client";
import type { Notification, NotificationsResponse } from "@/types/notification";

export const notificationsApi = {
  getNotifications: () =>
    apiClient.get<NotificationsResponse>("/notifications").then((r) => r.data),

  markAsRead: (id: string) =>
    apiClient.patch<{ notification: Notification }>(`/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: () => apiClient.patch<{ msg: string }>("/notifications/read-all").then((r) => r.data),
};
