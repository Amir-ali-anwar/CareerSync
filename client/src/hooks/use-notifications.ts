"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { notificationsApi } from "@/lib/api/notifications";
import { API_BASE_URL } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants";
import type { Notification, NotificationsResponse } from "@/types/notification";

export function useNotifications() {
  return useQuery({
    queryKey: QUERY_KEYS.notifications,
    queryFn: notificationsApi.getNotifications,
    // The socket connection (useNotificationSocket) is the primary live-update path;
    // this is just a fallback in case a tab misses a push (e.g. briefly offline).
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<NotificationsResponse>(QUERY_KEYS.notifications, (current) => {
        if (!current) return current;
        const target = current.notifications.find((n) => n._id === id);
        if (!target || target.read) return current;
        return {
          ...current,
          unreadCount: Math.max(0, current.unreadCount - 1),
          notifications: current.notifications.map((n) => (n._id === id ? { ...n, read: true } : n)),
        };
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.setQueryData<NotificationsResponse>(QUERY_KEYS.notifications, (current) => {
        if (!current) return current;
        return {
          ...current,
          unreadCount: 0,
          notifications: current.notifications.map((n) => ({ ...n, read: true })),
        };
      });
    },
  });
}

/**
 * Opens one socket.io connection for the lifetime of an authenticated dashboard session
 * (mounted once from the dashboard layout, not per-component) and prepends any pushed
 * notification into the same cache `useNotifications` reads, so the bell updates instantly
 * without waiting for the 60s polling fallback. Auth is cookie-based (see
 * services/realtime/socket.js on the backend) - `withCredentials` is required since the
 * frontend and API run on different ports/origins in dev.
 */
export function useNotificationSocket(enabled: boolean) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const socket = io(API_BASE_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.on("notification", (notification: Notification) => {
      queryClient.setQueryData<NotificationsResponse>(QUERY_KEYS.notifications, (current) => {
        if (!current) return current;
        if (current.notifications.some((n) => n._id === notification._id)) return current;
        return {
          ...current,
          unreadCount: current.unreadCount + 1,
          totalNotifications: current.totalNotifications + 1,
          notifications: [notification, ...current.notifications],
        };
      });

      toast(notification.title, {
        description: notification.message,
        action: notification.link
          ? { label: "View", onClick: () => router.push(notification.link as string) }
          : undefined,
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, queryClient, router]);
}
