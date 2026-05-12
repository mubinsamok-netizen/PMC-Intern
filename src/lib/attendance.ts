import { randomUUID } from "crypto";
import { appendRow, ensureHeaders, getRows, updateRow, type SheetRow } from "@/lib/google/sheets";
import type { SessionUser } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/users";
import { notifyLineCheckIn } from "@/lib/line";
import { createNotificationsForAdmins } from "@/lib/notifications";

const ATTENDANCE_SHEET = "Attendance";

export const ATTENDANCE_HEADERS = [
  "id",
  "user_id",
  "intern_code",
  "student_id",
  "employee_code",
  "full_name",
  "university",
  "department",
  "check_in_date",
  "check_in_time",
  "check_out_time",
  "work_mode",
  "work_location_type",
  "location_lat",
  "location_lng",
  "location_address",
  "selfie_url",
  "checkin_selfie_url",
  "checkout_selfie_url",
  "status",
  "total_hours",
  "is_late",
  "corrected_by",
  "correction_reason",
  "notes",
  "created_at",
  "updated_at",
];

const WORK_MODES = ["Office", "Site", "WFH", "Field"];

function bangkokParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
    hour: Number(parts.hour),
  };
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeDate(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 20000) {
    const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return date.toISOString().slice(0, 10);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

function normalizeTime(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
    const [h, m, s = "00"] = raw.split(":");
    return `${h.padStart(2, "0")}:${m}:${s}`;
  }
  const serial = Number(raw);
  if (Number.isFinite(serial) && serial >= 0 && serial < 1) {
    const total = Math.round(serial * 24 * 3600);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(parsed);
  }
  return raw;
}

function boolText(value: unknown) {
  return String(value) === "true" || value === true ? "true" : "false";
}

function calcHours(inTime: string, outTime: string) {
  const [ih, im, is] = inTime.split(":").map(Number);
  const [oh, om, os] = outTime.split(":").map(Number);
  const start = ih * 3600 + im * 60 + (is || 0);
  let end = oh * 3600 + om * 60 + (os || 0);
  if (end < start) end += 24 * 3600;
  return Math.round(((end - start) / 3600) * 100) / 100;
}

function hoursDisplay(value: unknown) {
  const hours = Number(value || 0);
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h} ชม. ${m} นาที`;
}

function formatRecord(row: SheetRow) {
  const total = Number(row.total_hours || 0);
  return {
    id: row.id,
    user_id: row.user_id,
    intern_code: row.intern_code || row.employee_code,
    student_id: row.student_id,
    employee_code: row.employee_code,
    full_name: row.full_name,
    university: row.university,
    department: row.department,
    check_in_date: normalizeDate(row.check_in_date),
    check_in_time: normalizeTime(row.check_in_time),
    check_out_time: normalizeTime(row.check_out_time),
    work_mode: row.work_mode,
    work_location_type: row.work_location_type || row.work_mode,
    location_lat: row.location_lat,
    location_lng: row.location_lng,
    location_address: row.location_address,
    selfie_url: row.selfie_url || row.checkin_selfie_url,
    checkin_selfie_url: row.checkin_selfie_url || row.selfie_url,
    checkout_selfie_url: row.checkout_selfie_url,
    status: row.status,
    total_hours: total,
    total_hours_display: hoursDisplay(total),
    is_late: row.is_late === "true" || row.is_late === "TRUE",
    corrected_by: row.corrected_by,
    correction_reason: row.correction_reason,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureAttendanceSheet() {
  return ensureHeaders(ATTENDANCE_SHEET, ATTENDANCE_HEADERS);
}

async function getUserProfile(sessionUser: SessionUser) {
  const user = await findUserByEmail(sessionUser.email);
  return user || {
    id: sessionUser.id,
    email: sessionUser.email,
    full_name: sessionUser.full_name,
    role: sessionUser.role,
    department: sessionUser.department || "",
    employee_code: sessionUser.employee_code || "",
    intern_code: sessionUser.intern_code || "",
    student_id: "",
    university: "",
  };
}

export async function getTodayAttendance(sessionUser: SessionUser) {
  await ensureAttendanceSheet();
  const today = bangkokParts().date;
  const { rows } = await getRows(ATTENDANCE_SHEET);
  const row = rows.find((r) => r.user_id === sessionUser.id && normalizeDate(r.check_in_date) === today && r.status !== "deleted");
  return row ? formatRecord(row) : null;
}

export async function listAttendance(sessionUser: SessionUser, filters: Record<string, string>) {
  await ensureAttendanceSheet();
  const { rows } = await getRows(ATTENDANCE_SHEET);
  const q = text(filters.q).toLowerCase();
  let scoped = rows.filter((row) => row.status !== "deleted");

  if (sessionUser.role !== "admin") {
    scoped = scoped.filter((row) => row.user_id === sessionUser.id);
  }
  if (filters.from) scoped = scoped.filter((row) => normalizeDate(row.check_in_date) >= filters.from);
  if (filters.to) scoped = scoped.filter((row) => normalizeDate(row.check_in_date) <= filters.to);
  if (filters.work_mode) scoped = scoped.filter((row) => row.work_mode === filters.work_mode);
  if (filters.department) scoped = scoped.filter((row) => row.department === filters.department);
  if (q) {
    scoped = scoped.filter((row) => [row.full_name, row.employee_code, row.intern_code, row.location_address, row.department]
      .some((value) => text(value).toLowerCase().includes(q)));
  }

  return scoped
    .sort((a, b) => `${normalizeDate(b.check_in_date)} ${normalizeTime(b.check_in_time)}`.localeCompare(`${normalizeDate(a.check_in_date)} ${normalizeTime(a.check_in_time)}`))
    .map(formatRecord);
}

export async function checkIn(sessionUser: SessionUser, data: Record<string, unknown>) {
  const headers = await ensureAttendanceSheet();
  const profile = await getUserProfile(sessionUser);
  const now = bangkokParts();
  const { rows } = await getRows(ATTENDANCE_SHEET);
  const existing = rows.find((r) => r.user_id === sessionUser.id && normalizeDate(r.check_in_date) === now.date && r.status !== "deleted");
  if (existing) {
    if (existing.check_out_time) throw new Error("วันนี้ลงเวลาเข้าและออกครบแล้ว ระบบกำหนดวันละ 1 รอบ");
    throw new Error("วันนี้เช็คอินแล้ว กรุณาเช็คเอาท์ก่อน");
  }

  const mode = WORK_MODES.includes(text(data.work_mode)) ? text(data.work_mode) : "Office";

  const record = {
    id: randomUUID(),
    user_id: sessionUser.id,
    intern_code: profile.intern_code || profile.employee_code || "",
    student_id: profile.student_id || "",
    employee_code: profile.employee_code || profile.intern_code || "",
    full_name: profile.full_name || sessionUser.full_name,
    university: profile.university || "",
    department: profile.department || sessionUser.department || "",
    check_in_date: now.date,
    check_in_time: now.time,
    check_out_time: "",
    work_mode: mode,
    work_location_type: mode,
    location_lat: text(data.location_lat),
    location_lng: text(data.location_lng),
    location_address: text(data.location_address),
    selfie_url: "",
    checkin_selfie_url: "",
    checkout_selfie_url: "",
    status: "checked_in",
    total_hours: "0",
    is_late: boolText(now.hour >= 9),
    corrected_by: "",
    correction_reason: "",
    notes: text(data.notes),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await appendRow(ATTENDANCE_SHEET, headers, record);
  const formatted = formatRecord({ ...record, _rowNumber: "" });
  notifyLineCheckIn(formatted).catch((error) => console.error(error));
  createNotificationsForAdmins(
    formatted.is_late ? "warning" : "checkin",
    formatted.is_late ? "นักศึกษาฝึกงานเช็คอินสาย" : "นักศึกษาฝึกงานเช็คอิน",
    `${formatted.full_name} เช็คอินเวลา ${formatted.check_in_time} (${formatted.work_mode || "-"})`,
    "/",
  ).catch((error) => console.error(error));
  return formatted;
}

export async function checkOut(sessionUser: SessionUser, data: Record<string, unknown>) {
  const headers = await ensureAttendanceSheet();
  const now = bangkokParts();
  const { rows } = await getRows(ATTENDANCE_SHEET);
  const row = rows.find((r) => r.user_id === sessionUser.id && normalizeDate(r.check_in_date) === now.date && r.status !== "deleted");
  if (!row) throw new Error("วันนี้ยังไม่ได้เช็คอิน");
  if (row.check_out_time) throw new Error("วันนี้เช็คเอาท์แล้ว ระบบกำหนดวันละ 1 รอบ");

  const totalHours = calcHours(normalizeTime(row.check_in_time), now.time);
  const updates = {
    check_out_time: now.time,
    checkout_selfie_url: "",
    status: "checked_out",
    total_hours: String(totalHours),
    updated_at: new Date().toISOString(),
  };
  await updateRow(ATTENDANCE_SHEET, headers, Number(row._rowNumber), updates, row);
  const formatted = formatRecord({ ...row, ...updates });
  createNotificationsForAdmins(
    "checkout",
    "นักศึกษาฝึกงานเช็คเอาท์",
    `${formatted.full_name} เช็คเอาท์เวลา ${formatted.check_out_time || "-"} รวม ${formatted.total_hours_display || "-"}`,
    "/",
  ).catch((error) => console.error(error));
  return formatted;
}

export async function deleteAttendance(sessionUser: SessionUser, id: string) {
  if (sessionUser.role !== "admin") throw new Error("Admin only");
  const headers = await ensureAttendanceSheet();
  const { rows } = await getRows(ATTENDANCE_SHEET);
  const row = rows.find((r) => r.id === id);
  if (!row) throw new Error("ไม่พบรายการลงเวลา");
  await updateRow(ATTENDANCE_SHEET, headers, Number(row._rowNumber), {
    status: "deleted",
    updated_at: new Date().toISOString(),
  }, row);
  return { ok: true };
}

export async function updateAttendance(sessionUser: SessionUser, id: string, data: Record<string, unknown>) {
  if (sessionUser.role !== "admin") throw new Error("Admin only");
  const headers = await ensureAttendanceSheet();
  const { rows } = await getRows(ATTENDANCE_SHEET);
  const row = rows.find((r) => r.id === id && r.status !== "deleted");
  if (!row) throw new Error("ไม่พบรายการลงเวลา");

  const correctionReason = text(data.correction_reason);
  if (!correctionReason) throw new Error("กรุณาระบุเหตุผลการแก้ไข");

  const checkInDate = normalizeDate(data.check_in_date ?? row.check_in_date);
  const checkInTime = normalizeTime(data.check_in_time ?? row.check_in_time);
  const checkOutTime = normalizeTime(data.check_out_time ?? row.check_out_time);
  if (!checkInDate || !checkInTime) throw new Error("กรุณาระบุวันที่และเวลาเข้า");

  const mode = WORK_MODES.includes(text(data.work_mode)) ? text(data.work_mode) : text(row.work_mode) || "Office";
  const totalHours = checkOutTime ? calcHours(checkInTime, checkOutTime) : 0;
  const updates = {
    check_in_date: checkInDate,
    check_in_time: checkInTime,
    check_out_time: checkOutTime,
    work_mode: mode,
    work_location_type: mode,
    location_lat: data.location_lat === undefined ? row.location_lat : text(data.location_lat),
    location_lng: data.location_lng === undefined ? row.location_lng : text(data.location_lng),
    location_address: data.location_address === undefined ? row.location_address : text(data.location_address),
    status: checkOutTime ? "checked_out" : "checked_in",
    total_hours: String(totalHours),
    is_late: boolText(Number(checkInTime.slice(0, 2)) >= 9),
    corrected_by: sessionUser.full_name || sessionUser.email,
    correction_reason: correctionReason,
    notes: data.notes === undefined ? row.notes : text(data.notes),
    updated_at: new Date().toISOString(),
  };

  await updateRow(ATTENDANCE_SHEET, headers, Number(row._rowNumber), updates, row);
  const formatted = formatRecord({ ...row, ...updates });
  createNotificationsForAdmins(
    "correction",
    "มีการแก้ไขรายการลงเวลา",
    `${formatted.full_name} ถูกแก้ไขเวลาโดย ${updates.corrected_by}: ${correctionReason}`,
    "/",
  ).catch((error) => console.error(error));
  return formatted;
}
