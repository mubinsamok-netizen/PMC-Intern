import { ensureHeaders, getRows } from "@/lib/google/sheets";

const HOLIDAYS_SHEET = "Holidays";

export const HOLIDAY_HEADERS = [
  "date",
  "name",
  "status",
  "created_at",
  "updated_at",
];

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
