import type { SessionUser } from "@/lib/auth/session";
import { listAttendance } from "@/lib/attendance";
import { listLeaveRequests } from "@/lib/leave-requests";
import {
  notifyLineCheckInReminder,
  notifyLineCheckOutReminder,
  notifyLineDailySummary,
} from "@/lib/line";
import { listUsers } from "@/lib/users";
import { isWorkday } from "@/lib/workdays";

const AUTOMATION_USER: SessionUser = {
  id: "line-automation",
  email: "line-automation@system.local",
  full_name: "LINE Automation",
  role: "admin",
};

type AutomationAction = "summary" | "check-in-reminder" | "check-out-reminder" | "all";

type UserLike = {
  id?: unknown;
  full_name?: unknown;
  employee_code?: unknown;
  intern_code?: unknown;
};

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

function text(value: unknown) {
  return String(value ?? "").trim();
}

function displayName(user: UserLike) {
  const code = text(user.intern_code || user.employee_code);
  return code ? `${text(user.full_name) || "-"} (${code})` : text(user.full_name) || "-";
}

function isApprovedLeaveOnDate(row: { status: string; start_date: string; end_date: string }, date: string) {
  return row.status === "approved" && row.start_date <= date && row.end_date >= date;
}

async function collectDailyData(date: string) {
  const [users, attendance, leaveToday, pendingLeave] = await Promise.all([
    listUsers({ role: "intern", status: "active" }),
    listAttendance(AUTOMATION_USER, { from: date, to: date }),
    listLeaveRequests(AUTOMATION_USER, { from: date, to: date }),
    listLeaveRequests(AUTOMATION_USER, { status: "pending" }),
  ]);

  const activeInterns = users as UserLike[];
  const checkedInUserIds = new Set(attendance.map((row) => row.user_id));
  const approvedLeaveUserIds = new Set(
    leaveToday
      .filter((row) => isApprovedLeaveOnDate(row, date))
      .map((row) => row.user_id),
  );
  const checkedOut = attendance.filter((row) => row.check_out_time || row.status === "checked_out");
  const notCheckedOut = attendance.filter((row) => !row.check_out_time && row.status === "checked_in");
  const missingCheckIn = activeInterns.filter((user) => {
    const id = text(user.id);
    return id && !checkedInUserIds.has(id) && !approvedLeaveUserIds.has(id);
  });

  return {
    users: activeInterns,
    attendance,
    leaveToday,
    pendingLeave,
    checkedOut,
    notCheckedOut,
    missingCheckIn,
    approvedLeaveToday: leaveToday.filter((row) => isApprovedLeaveOnDate(row, date)),
  };
}

export async function sendLineDailySummary(date = bangkokDate()) {
  const data = await collectDailyData(date);
  const result = await notifyLineDailySummary({
    date,
    activeInterns: data.users.length,
    checkedIn: data.attendance.length,
    checkedOut: data.checkedOut.length,
    late: data.attendance.filter((row) => row.is_late).length,
    missingCheckIn: data.missingCheckIn.length,
    pendingLeave: data.pendingLeave.length,
    approvedLeaveToday: data.approvedLeaveToday.length,
  });

  return {
    ok: true,
    action: "summary",
    date,
    line: result,
    summary: {
      activeInterns: data.users.length,
      checkedIn: data.attendance.length,
      checkedOut: data.checkedOut.length,
      late: data.attendance.filter((row) => row.is_late).length,
      missingCheckIn: data.missingCheckIn.length,
      pendingLeave: data.pendingLeave.length,
      approvedLeaveToday: data.approvedLeaveToday.length,
    },
  };
}

export async function sendLineCheckInReminder(date = bangkokDate()) {
  const data = await collectDailyData(date);
  const names = data.missingCheckIn.map(displayName);
  const result = await notifyLineCheckInReminder({ date, names });

  return {
    ok: true,
    action: "check-in-reminder",
    date,
    line: result,
    count: names.length,
    names,
  };
}

export async function sendLineCheckOutReminder(date = bangkokDate()) {
  const data = await collectDailyData(date);
  const names = data.notCheckedOut.map((row) => {
    const code = row.intern_code || row.employee_code;
    return code ? `${row.full_name || "-"} (${code})` : row.full_name || "-";
  });
  const result = await notifyLineCheckOutReminder({ date, names });

  return {
    ok: true,
    action: "check-out-reminder",
    date,
    line: result,
    count: names.length,
    names,
  };
}

export async function runLineAutomation(action: string, date = bangkokDate(), options: { force?: boolean } = {}) {
  const normalized = (action || "summary") as AutomationAction;
  if (!options.force && !(await isWorkday(date))) {
    return { ok: true, action: normalized, date, skipped: true, reason: "Non-working day" };
  }
  if (normalized === "summary") return sendLineDailySummary(date);
  if (normalized === "check-in-reminder") return sendLineCheckInReminder(date);
  if (normalized === "check-out-reminder") return sendLineCheckOutReminder(date);
  if (normalized === "all") {
    const [summary, checkInReminder, checkOutReminder] = await Promise.all([
      sendLineDailySummary(date),
      sendLineCheckInReminder(date),
      sendLineCheckOutReminder(date),
    ]);
    return { ok: true, action: "all", date, results: [summary, checkInReminder, checkOutReminder] };
  }
  throw new Error("Invalid LINE automation action");
}
