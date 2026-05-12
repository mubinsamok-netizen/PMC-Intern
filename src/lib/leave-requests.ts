import { randomUUID } from "crypto";
import { appendRow, ensureHeaders, getRows, updateRow, type SheetRow } from "@/lib/google/sheets";
import type { SessionUser } from "@/lib/auth/session";
import { createNotification, createNotificationsForAdmins } from "@/lib/notifications";
import { findUserByEmail } from "@/lib/users";
import { notifyLineLeaveRequest } from "@/lib/line";
import { uploadBase64File } from "@/lib/google/drive";
import { businessDayCount } from "@/lib/workdays";

const LEAVE_REQUESTS_SHEET = "LeaveRequests";

export const LEAVE_REQUEST_HEADERS = [
  "id",
  "user_id",
  "intern_code",
  "employee_code",
  "full_name",
  "department",
  "leave_type",
  "start_date",
  "end_date",
  "total_days",
  "reason",
  "attachment_url",
  "attachment_name",
  "attachment_file_id",
  "attachment_mime_type",
  "status",
  "admin_note",
  "reviewed_by",
  "reviewed_at",
  "created_at",
  "updated_at",
];

function text(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeDate(value: unknown) {
  const raw = text(value, 40);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function dayCount(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 86400000) + 1;
}

function formatRequest(row: SheetRow) {
  return {
    id: row.id,
    user_id: row.user_id,
    intern_code: row.intern_code,
    employee_code: row.employee_code,
    full_name: row.full_name,
    department: row.department,
    leave_type: row.leave_type,
    start_date: row.start_date,
    end_date: row.end_date,
    total_days: Number(row.total_days || 0),
    reason: row.reason,
    attachment_url: row.attachment_url,
    attachment_name: row.attachment_name,
    attachment_file_id: row.attachment_file_id,
    attachment_mime_type: row.attachment_mime_type,
    status: row.status || "pending",
    admin_note: row.admin_note,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureLeaveRequestsSheet() {
  return ensureHeaders(LEAVE_REQUESTS_SHEET, LEAVE_REQUEST_HEADERS);
}

async function getUserProfile(sessionUser: SessionUser) {
  const user = await findUserByEmail(sessionUser.email);
  return user || sessionUser;
}

export async function listLeaveRequests(sessionUser: SessionUser, filters: Record<string, string> = {}) {
  await ensureLeaveRequestsSheet();
  const { rows } = await getRows(LEAVE_REQUESTS_SHEET);
  const q = text(filters.q).toLowerCase();
  let scoped = rows;

  if (sessionUser.role !== "admin") scoped = scoped.filter((row) => row.user_id === sessionUser.id);
  if (filters.status) scoped = scoped.filter((row) => row.status === filters.status);
  if (filters.from) scoped = scoped.filter((row) => row.end_date >= filters.from);
  if (filters.to) scoped = scoped.filter((row) => row.start_date <= filters.to);
  if (q) {
    scoped = scoped.filter((row) => [row.full_name, row.employee_code, row.intern_code, row.department, row.reason]
      .some((value) => text(value).toLowerCase().includes(q)));
  }

  return scoped
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .map(formatRequest);
}

export async function createLeaveRequest(sessionUser: SessionUser, data: Record<string, unknown>) {
  if (sessionUser.role === "admin") throw new Error("บัญชีผู้ดูแลไม่ต้องส่งคำขอลา");
  const headers = await ensureLeaveRequestsSheet();
  const profile = await getUserProfile(sessionUser);
  const startDate = normalizeDate(data.start_date);
  const endDate = normalizeDate(data.end_date);
  const calendarDays = dayCount(startDate, endDate);
  const reason = text(data.reason);

  if (!startDate || !endDate || calendarDays <= 0) throw new Error("กรุณาระบุช่วงวันที่ลาให้ถูกต้อง");
  if (!reason) throw new Error("กรุณาระบุเหตุผลการลา");

  const totalDays = await businessDayCount(startDate, endDate);
  if (totalDays <= 0) throw new Error("ช่วงวันที่ลาต้องมีวันทำงานอย่างน้อย 1 วัน");

  let attachment = {
    url: "",
    name: "",
    fileId: "",
    mimeType: "",
  };
  if (data.attachmentBase64) {
    const uploaded = await uploadBase64File(
      text(data.attachmentBase64, 14_000_000),
      "leave-attachments",
      `leave_${sessionUser.id}_${Date.now()}`,
    );
    attachment = {
      url: uploaded.driveUrl || uploaded.url,
      name: text(data.attachmentName, 180) || uploaded.name,
      fileId: uploaded.fileId,
      mimeType: uploaded.mimeType,
    };
  }

  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    user_id: sessionUser.id,
    intern_code: text(profile.intern_code || profile.employee_code),
    employee_code: text(profile.employee_code || profile.intern_code),
    full_name: text(profile.full_name || sessionUser.full_name),
    department: text(profile.department || sessionUser.department),
    leave_type: text(data.leave_type, 80) || "ลากิจ",
    start_date: startDate,
    end_date: endDate,
    total_days: String(totalDays),
    reason,
    attachment_url: attachment.url,
    attachment_name: attachment.name,
    attachment_file_id: attachment.fileId,
    attachment_mime_type: attachment.mimeType,
    status: "pending",
    admin_note: "",
    reviewed_by: "",
    reviewed_at: "",
    created_at: now,
    updated_at: now,
  };

  await appendRow(LEAVE_REQUESTS_SHEET, headers, record);
  const formatted = formatRequest({ ...record, _rowNumber: "" });
  notifyLineLeaveRequest(formatted).catch((error) => console.error(error));
  createNotificationsForAdmins(
    "leave_request",
    "มีคำขอลาใหม่",
    `${formatted.full_name} ขอ${formatted.leave_type} ${formatted.start_date} ถึง ${formatted.end_date}`,
    "/",
  ).catch((error) => console.error(error));
  return formatted;
}

export async function reviewLeaveRequest(sessionUser: SessionUser, id: string, data: Record<string, unknown>) {
  if (sessionUser.role !== "admin") throw new Error("Admin only");
  const headers = await ensureLeaveRequestsSheet();
  const { rows } = await getRows(LEAVE_REQUESTS_SHEET);
  const row = rows.find((item) => item.id === id);
  if (!row) throw new Error("ไม่พบคำขอลา");

  const status = text(data.status) === "approved" ? "approved" : text(data.status) === "rejected" ? "rejected" : "";
  if (!status) throw new Error("สถานะคำขอไม่ถูกต้อง");
  if (row.status !== "pending") throw new Error("คำขอนี้ถูกพิจารณาแล้ว");

  const updates = {
    status,
    admin_note: text(data.admin_note),
    reviewed_by: sessionUser.full_name || sessionUser.email,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await updateRow(LEAVE_REQUESTS_SHEET, headers, Number(row._rowNumber), updates, row);
  const formatted = formatRequest({ ...row, ...updates });
  createNotification(
    formatted.user_id,
    "leave_review",
    status === "approved" ? "คำขอลาได้รับอนุมัติ" : "คำขอลาไม่ผ่านการอนุมัติ",
    `${formatted.leave_type} ${formatted.start_date} ถึง ${formatted.end_date}${updates.admin_note ? `: ${updates.admin_note}` : ""}`,
    "/",
  ).catch((error) => console.error(error));
  return formatted;
}
