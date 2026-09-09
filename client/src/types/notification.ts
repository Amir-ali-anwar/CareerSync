export type NotificationType = "application_submitted" | "application_status_changed";

export interface Notification {
  _id: string;
  user: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  totalNotifications: number;
  unreadCount: number;
  page: number;
  limit: number;
}
