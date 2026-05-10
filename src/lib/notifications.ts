import { randomUUID } from "crypto";
import { appendRow, ensureHeaders, getRows, updateRow, type SheetRow } from "@/lib/google/sheets";
import type { SessionUser } from "@/lib/auth/session";
import { listUsers } from "@/lib/users";

const NOTIFICATIONS_SHEET = "Notifications";

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

function formatDateTime(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatNotification(row: SheetRow) {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type || "info",
    title: row.title,
    message: row.message,
    link: row.link,
    read_at: row.read_at ? formatDateTime(row.read_at) : null,
    created_at: formatDateTime(row.created_at),
  };
}

export async function ensureNotificationSheet() {
  return ensureHeaders(NOTIFICATIONS_SHEET, NOTIFICATION_HEADERS);
}

export async function createNotification(userId: string, type: string, title: string, message: string, link = "") {
  const headers = await ensureNotificationSheet();
  const record = {
    id: randomUUID(),
    user_id: userId,
    type: text(type, 50) || "info",
    title: text(title, 200),
    message: text(message, 1000),
    link: text(link, 300),
    read_at: "",
    created_at: new Date().toISOString(),
  };
  await appendRow(NOTIFICATIONS_SHEET, headers, record);
  return formatNotification({ ...record, _rowNumber: "" });
}

export async function createNotificationsForAdmins(type: string, title: string, message: string, link = "") {
  const admins = await listUsers({ role: "admin", status: "active" });
  const created = [];
  for (const admin of admins) {
    created.push(await createNotification(String(admin.id), type, title, message, link));
  }
  return created;
}

export async function listNotifications(sessionUser: SessionUser, options: { limit?: string; unread?: string } = {}) {
  await ensureNotificationSheet();
  const limit = Math.min(50, Math.max(1, Number(options.limit || 20)));
  const unreadOnly = options.unread === "true" || options.unread === "1";
  const { rows } = await getRows(NOTIFICATIONS_SHEET);
  let scoped = rows.filter((row) => row.user_id === sessionUser.id);
  const unread = scoped.filter((row) => !row.read_at).length;
  if (unreadOnly) scoped = scoped.filter((row) => !row.read_at);

  scoped = scoped
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, limit);

  return {
    rows: scoped.map(formatNotification),
    unread,
  };
}

export async function markNotificationRead(sessionUser: SessionUser, id: string) {
  const headers = await ensureNotificationSheet();
  const { rows } = await getRows(NOTIFICATIONS_SHEET);
  const row = rows.find((item) => item.id === id);
  if (!row) throw new Error("ไม่พบการแจ้งเตือน");
  if (row.user_id !== sessionUser.id) throw new Error("Forbidden");
  if (!row.read_at) {
    await updateRow(NOTIFICATIONS_SHEET, headers, Number(row._rowNumber), {
      read_at: new Date().toISOString(),
    });
  }
  return { ok: true };
}

export async function markAllNotificationsRead(sessionUser: SessionUser) {
  const headers = await ensureNotificationSheet();
  const { rows } = await getRows(NOTIFICATIONS_SHEET);
  const unread = rows.filter((row) => row.user_id === sessionUser.id && !row.read_at);
  const now = new Date().toISOString();
  for (const row of unread) {
    await updateRow(NOTIFICATIONS_SHEET, headers, Number(row._rowNumber), { read_at: now });
  }
  return { ok: true, count: unread.length };
}
