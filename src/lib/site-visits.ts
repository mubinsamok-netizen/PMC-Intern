import { randomUUID } from "crypto";
import { appendRow, ensureHeaders, getRows, type SheetRow } from "@/lib/google/sheets";
import type { SessionUser } from "@/lib/auth/session";
import { getTodayAttendance } from "@/lib/attendance";
import { notifyLineSiteVisit } from "@/lib/line";

const SITE_VISITS_SHEET = "SiteVisits";

export const SITE_VISIT_HEADERS = [
  "id",
  "attendance_id",
  "user_id",
  "intern_code",
  "employee_code",
  "full_name",
  "check_in_date",
  "site_name",
  "location_lat",
  "location_lng",
  "location_address",
  "notes",
  "visited_at",
  "status",
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

function formatVisit(row: SheetRow) {
  return {
    id: row.id,
    attendance_id: row.attendance_id,
    user_id: row.user_id,
    intern_code: row.intern_code,
    employee_code: row.employee_code,
    full_name: row.full_name,
    check_in_date: normalizeDate(row.check_in_date),
    site_name: row.site_name,
    location_lat: row.location_lat,
    location_lng: row.location_lng,
    location_address: row.location_address,
    notes: row.notes,
    visited_at: row.visited_at,
    status: row.status || "active",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureSiteVisitsSheet() {
  return ensureHeaders(SITE_VISITS_SHEET, SITE_VISIT_HEADERS);
}

export async function listSiteVisits(sessionUser: SessionUser, filters: Record<string, string> = {}) {
  await ensureSiteVisitsSheet();
  const { rows } = await getRows(SITE_VISITS_SHEET);
  let scoped = rows.filter((row) => (row.status || "active") !== "deleted");

  if (sessionUser.role !== "admin") scoped = scoped.filter((row) => row.user_id === sessionUser.id);
  if (filters.attendance_id) scoped = scoped.filter((row) => row.attendance_id === filters.attendance_id);
  if (filters.date) scoped = scoped.filter((row) => normalizeDate(row.check_in_date) === filters.date);
  if (filters.user_id && sessionUser.role === "admin") scoped = scoped.filter((row) => row.user_id === filters.user_id);

  return scoped
    .sort((a, b) => String(a.visited_at || a.created_at || "").localeCompare(String(b.visited_at || b.created_at || "")))
    .map(formatVisit);
}

export async function createSiteVisit(sessionUser: SessionUser, data: Record<string, unknown>) {
  if (sessionUser.role === "admin") throw new Error("Admin only views site visits; interns create them from check-in.");

  const today = await getTodayAttendance(sessionUser);
  if (!today) throw new Error("กรุณาเช็คอินก่อนเพิ่มไซต์งาน");
  if (today.check_out_time) throw new Error("เช็คเอาท์แล้ว ไม่สามารถเพิ่มไซต์งานของวันนี้ได้");

  const attendanceId = text(data.attendance_id, 120);
  if (attendanceId && attendanceId !== today.id) throw new Error("รายการลงเวลาไม่ตรงกับวันนี้");

  const siteName = text(data.site_name, 200);
  const locationAddress = text(data.location_address, 500);
  if (!siteName && !locationAddress) throw new Error("กรุณาระบุชื่อไซต์หรือสถานที่");

  const headers = await ensureSiteVisitsSheet();
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    attendance_id: today.id,
    user_id: sessionUser.id,
    intern_code: today.intern_code || today.employee_code || "",
    employee_code: today.employee_code || today.intern_code || "",
    full_name: today.full_name || sessionUser.full_name,
    check_in_date: today.check_in_date,
    site_name: siteName || locationAddress,
    location_lat: text(data.location_lat, 80),
    location_lng: text(data.location_lng, 80),
    location_address: locationAddress,
    notes: text(data.notes, 1000),
    visited_at: now,
    status: "active",
    created_at: now,
    updated_at: now,
  };

  await appendRow(SITE_VISITS_SHEET, headers, record);
  const formatted = formatVisit({ ...record, _rowNumber: "" });
  notifyLineSiteVisit(formatted).catch((error) => console.error(error));
  return formatted;
}
