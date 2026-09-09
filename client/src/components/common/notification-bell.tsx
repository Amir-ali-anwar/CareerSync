"use client";

import Link from "next/link";
import { Bell, ClipboardList, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/use-notifications";
import { formatRelativeDate, cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types/notification";

const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  application_submitted: ClipboardList,
  application_status_changed: Sparkles,
};

function NotificationRow({ notification }: { notification: Notification }) {
  const markAsRead = useMarkNotificationRead();
  const Icon = TYPE_ICONS[notification.type] ?? Bell;

  const content = (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg p-2.5 transition-colors hover:bg-muted/60",
        !notification.read && "bg-primary-light/40"
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{notification.title}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelativeDate(notification.createdAt)}</p>
      </div>
      {!notification.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
    </div>
  );

  function handleClick() {
    if (!notification.read) markAsRead.mutate(notification._id);
  }

  if (notification.link) {
    return (
      <Link href={notification.link} onClick={handleClick} className="block">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="block w-full text-left">
      {content}
    </button>
  );
}

export function NotificationBell() {
  const { data, isLoading, isError } = useNotifications();
  const markAllAsRead = useMarkAllNotificationsRead();
  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="relative flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="size-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-error text-[10px] font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin p-1.5">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Couldn&apos;t load notifications. Try again later.
            </p>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <div className="space-y-0.5">
              {notifications.map((notification) => (
                <NotificationRow key={notification._id} notification={notification} />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
