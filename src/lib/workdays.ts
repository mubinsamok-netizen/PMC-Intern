import { randomUUID } from "crypto";
import { appendRow, ensureHeaders, getRows, updateRow, type SheetRow } from "@/lib/google/sheets";

const HOLIDAYS_SHEET = "Holidays";

export const HOLIDAY_HEADERS = [
  "id",
  "date",
  "name",
  "status",
  "created_at",
  "updated_at",
];

export type Holiday = {
  id: string;
  date: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function dateOnly(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function text(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function formatHoliday(row: SheetRow): Holiday {
  return {
    id: row.id || row._rowNumber,
    date: dateOnly(row.date),
    name: text(row.name, 120) || "วันหยุด",
    status: text(row.status, 30) || "active",
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
  };
}

async function findHolidayRow(id: string) {
  await ensureHeaders(HOLIDAYS_SHEET, HOLIDAY_HEADERS);
  const { rows } = await getRows(HOLIDAYS_SHEET);
  return rows.find((row) => row.id === id || row._rowNumber === id || dateOnly(row.date) === id);
}

export async function listHolidays(options: { includeInactive?: boolean } = {}) {
  await ensureHeaders(HOLIDAYS_SHEET, HOLIDAY_HEADERS);
  const { rows } = await getRows(HOLIDAYS_SHEET);
  return rows
    .map(formatHoliday)
    .filter((holiday) => holiday.date && (options.includeInactive || !["deleted"].includes(holiday.status.toLowerCase())))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function createHoliday(input: { date: unknown; name?: unknown; status?: unknown }) {
  const date = dateOnly(input.date);
  if (!date) throw new Error("กรุณาระบุวันที่วันหยุด");

  const headers = await ensureHeaders(HOLIDAYS_SHEET, HOLIDAY_HEADERS);
  const now = new Date().toISOString();
  const existing = await findHolidayRow(date);
  if (existing && !["deleted"].includes(String(existing.status || "active").toLowerCase())) {
    throw new Error("มีวันหยุดวันที่นี้อยู่แล้ว");
  }

  const record = {
    id: randomUUID(),
    date,
    name: text(input.name, 120) || "วันหยุด",
    status: text(input.status, 30) || "active",
    created_at: now,
    updated_at: now,
  };
  await appendRow(HOLIDAYS_SHEET, headers, record);
  return formatHoliday({ ...record, _rowNumber: "" });
}

export async function updateHoliday(id: string, input: { date?: unknown; name?: unknown; status?: unknown }) {
  const headers = await ensureHeaders(HOLIDAYS_SHEET, HOLIDAY_HEADERS);
  const row = await findHolidayRow(id);
  if (!row) throw new Error("ไม่พบวันหยุดที่ต้องการแก้ไข");

  const nextDate = input.date === undefined ? dateOnly(row.date) : dateOnly(input.date);
  if (!nextDate) throw new Error("กรุณาระบุวันที่วันหยุด");

  const next = {
    id: row.id || randomUUID(),
    date: nextDate,
    name: input.name === undefined ? text(row.name, 120) || "วันหยุด" : text(input.name, 120) || "วันหยุด",
    status: input.status === undefined ? text(row.status, 30) || "active" : text(input.status, 30) || "active",
    updated_at: new Date().toISOString(),
  };

  await updateRow(HOLIDAYS_SHEET, headers, Number(row._rowNumber), next, row);
  return formatHoliday({ ...row, ...next });
}

export async function deleteHoliday(id: string) {
  return updateHoliday(id, { status: "deleted" });
}

export async function listActiveHolidayDates() {
  await ensureHeaders(HOLIDAYS_SHEET, HOLIDAY_HEADERS);
  const { rows } = await getRows(HOLIDAYS_SHEET);
  return new Set(
    rows
      .filter((row) => !["deleted", "inactive"].includes(String(row.status || "active").toLowerCase()))
      .map((row) => dateOnly(row.date))
      .filter(Boolean),
  );
}

export async function isWorkday(date: string) {
  const normalized = dateOnly(date);
  if (!normalized) return true;
  const parsed = parseDate(normalized);
  const day = parsed.getUTCDay();
  if (day === 0 || day === 6) return false;
  const holidays = await listActiveHolidayDates();
  return !holidays.has(normalized);
}

export async function businessDayCount(startDate: string, endDate: string) {
  const start = dateOnly(startDate);
  const end = dateOnly(endDate);
  if (!start || !end || end < start) return 0;

  const holidays = await listActiveHolidayDates();
  let count = 0;
  for (let date = parseDate(start); date <= parseDate(end); date = addUtcDays(date, 1)) {
    const day = date.getUTCDay();
    const iso = date.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidays.has(iso)) count += 1;
  }
  return count;
}
