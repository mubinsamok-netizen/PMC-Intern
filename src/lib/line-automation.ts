import { getRows, ensureHeaders, type SheetRow } from "@/lib/google/sheets";
import { ATTENDANCE_HEADERS } from "@/lib/attendance";
import { getChatbotSettings, isChatbotActionEnabled } from "@/lib/chatbot-settings";
import { notifyLineCheckOutReminder } from "@/lib/line";
import { isWorkday } from "@/lib/workdays";

const ATTENDANCE_SHEET = "Attendance";

function bangkokDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function normalizeDate(value: unknown) {
  const raw = String(value ?? "").trim();
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
  const raw = String(value ?? "").trim();
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
  return raw;
}

function checkedInToday(row: SheetRow, date: string) {
  return row.status !== "deleted"
    && normalizeDate(row.check_in_date) === date
    && Boolean(normalizeTime(row.check_in_time));
}

function checkedOut(row: SheetRow) {
  return Boolean(normalizeTime(row.check_out_time)) || row.status === "checked_out";
}

async function getCheckoutReminderStats(date: string) {
  await ensureHeaders(ATTENDANCE_SHEET, ATTENDANCE_HEADERS);
  const { rows } = await getRows(ATTENDANCE_SHEET);
  const todayRows = rows.filter((row) => checkedInToday(row, date));
  const pendingRows = todayRows.filter((row) => !checkedOut(row));

  return {
    totalCheckedIn: todayRows.length,
    pendingCount: pendingRows.length,
    pendingNames: pendingRows
      .map((row) => String(row.full_name || row.employee_code || row.intern_code || "").trim())
      .filter(Boolean),
  };
}

export async function runLineAutomation(
  action: string,
  date = bangkokDate(),
  options: { force?: boolean; targetGroupId?: string } = {},
): Promise<Record<string, unknown>> {
  const normalizedAction = action || "disabled";
  const settings = await getChatbotSettings();

  if (!settings.line_enabled && !options.force) {
    return {
      ok: true,
      action: normalizedAction,
      date,
      skipped: true,
      reason: "LINE chatbot is disabled in settings",
    };
  }

  if (!isChatbotActionEnabled(normalizedAction, settings) && !options.force) {
    return {
      ok: true,
      action: normalizedAction,
      date,
      skipped: true,
      reason: "This LINE automation action is disabled in settings",
    };
  }

  if (settings.skip_non_workdays && !options.force && !(await isWorkday(date))) {
    return {
      ok: true,
      action: normalizedAction,
      date,
      skipped: true,
      reason: "Skipped non-workday",
    };
  }

  if (normalizedAction !== "check-out-reminder") {
    return {
      ok: true,
      action: normalizedAction,
      date,
      skipped: true,
      reason: "Unsupported LINE automation action",
    };
  }

  const stats = await getCheckoutReminderStats(date);
  const result = await notifyLineCheckOutReminder({
    date,
    reminderTime: settings.check_out_time,
    ...stats,
  }, {
    force: options.force,
    targetGroupId: options.targetGroupId,
  });

  return {
    ok: true,
    action: normalizedAction,
    date,
    skipped: result.skipped,
    targetGroupId: options.targetGroupId || undefined,
    ...stats,
    line: result,
  };
}
