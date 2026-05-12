import { randomUUID } from "crypto";
import type { SessionUser } from "@/lib/auth/session";

export const NOTIFICATION_HEADERS = [
  "id",
  "user_id",
  "type",
  "title",
  "message",
  "link",
  "read_at",
  "created_at",
];

function text(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function formatNotification(userId: string, type: string, title: string, message: string, link = "") {
  return {
    id: randomUUID(),
    user_id: userId,
    type: text(type, 50) || "info",
    title: text(title, 200),
    message: text(message, 1000),
    link: text(link, 300),
    read_at: null,
    created_at: new Date().toISOString(),
  };
}

export async function ensureNotificationSheet() {
  return NOTIFICATION_HEADERS;
}

export async function createNotification(userId: string, type: string, title: string, message: string, link = "") {
  return formatNotification(userId, type, title, message, link);
}

export async function createNotificationsForAdmins(_type: string, _title: string, _message: string, _link = "") {
  return [];
}

export async function listNotifications(_sessionUser: SessionUser, _options: { limit?: string; unread?: string } = {}) {
  return {
    rows: [],
    unread: 0,
  };
}

export async function markNotificationRead(_sessionUser: SessionUser, _id: string) {
  return { ok: true };
}

export async function markAllNotificationsRead(_sessionUser: SessionUser) {
  return { ok: true, count: 0 };
}
