"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { ArrowIcon } from "../components/icons";
import styles from "../page.module.css";
import type { NotificationItem } from "../types/workout";
import {
  mapNotificationItem,
  type NotificationsApiResponse,
} from "../utils/apiMappers";

const formatNotificationTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function NotificationsPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [updatingIDs, setUpdatingIDs] = useState<number[]>([]);

  const loadNotifications = useCallback(async () => {
    const token = window.localStorage.getItem("group7pj_token");
    if (!token) {
      setNotifications([]);
      setErrorMessage("");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams({ limit: "30" });
      if (unreadOnly) {
        params.set("unreadOnly", "true");
      }
      const response = await fetch(`${apiUrl}/api/notifications?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as NotificationsApiResponse | { error?: string } | null;
      if (!response.ok || !payload || !("items" in payload)) {
        const message = payload && "error" in payload ? payload.error : undefined;
        throw new Error(message || "通知を読み込めませんでした。");
      }
      setNotifications(payload.items.map(mapNotificationItem));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "通知を読み込めませんでした。");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, unreadOnly]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markRead = async (notification: NotificationItem) => {
    if (notification.isRead || updatingIDs.includes(notification.id)) {
      return;
    }

    const token = window.localStorage.getItem("group7pj_token");
    if (!token) {
      setErrorMessage("ログイン情報を確認できません。もう一度ログインしてください。");
      return;
    }

    setUpdatingIDs((ids) => Array.from(new Set([...ids, notification.id])));
    setErrorMessage("");

    try {
      const response = await fetch(`${apiUrl}/api/notifications/${notification.id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as { id?: number; isRead?: boolean; error?: string } | null;
      if (!response.ok || !payload?.isRead) {
        throw new Error(payload?.error || "通知を既読にできませんでした。");
      }
      setNotifications((items) => items.map((item) => (
        item.id === notification.id ? { ...item, isRead: true } : item
      )));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "通知を既読にできませんでした。");
    } finally {
      setUpdatingIDs((ids) => ids.filter((id) => id !== notification.id));
    }
  };

  return (
    <AppShell activeView="notifications">
      <section className={styles.notificationsScreen}>
        <header className={styles.profileHeader}>
          <button className={styles.back} onClick={() => router.push("/")} type="button" aria-label="タイムラインに戻る">
            <ArrowIcon />
          </button>
          <h1>通知</h1>
          <span className={styles.headerSpacer} />
        </header>

        <div className={styles.notificationsBody}>
          <div className={styles.notificationToolbar}>
            <button
              className={!unreadOnly ? styles.selectedNotificationFilter : ""}
              onClick={() => setUnreadOnly(false)}
              type="button"
            >
              すべて
            </button>
            <button
              className={unreadOnly ? styles.selectedNotificationFilter : ""}
              onClick={() => setUnreadOnly(true)}
              type="button"
            >
              未読
            </button>
          </div>

          {errorMessage ? <p className={styles.profileNotice}>{errorMessage}</p> : null}
          {loading ? <p className={styles.emptyState}>通知を読み込んでいます...</p> : null}
          {!loading && notifications.length === 0 ? (
            <p className={styles.emptyState}>表示できる通知はまだありません。</p>
          ) : null}

          <div className={styles.notificationList}>
            {notifications.map((notification) => (
              <button
                className={`${styles.notificationItem} ${notification.isRead ? styles.readNotification : ""}`}
                key={notification.id}
                onClick={() => markRead(notification)}
                type="button"
              >
                <span className={styles.notificationType}>{notification.notificationTypeLabel}</span>
                <span className={styles.notificationBody}>{notification.body}</span>
                <time>{formatNotificationTime(notification.createdAt)}</time>
                {!notification.isRead ? <span className={styles.unreadDot} aria-label="未読" /> : null}
              </button>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
