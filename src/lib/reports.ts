import type { SessionUser } from "@/lib/auth/session";
import { listAttendance } from "@/lib/attendance";
import { env } from "@/lib/env";
import { getDriveClient, getSheetsClient } from "@/lib/google/client";

export type ReportGroupBy = "user" | "department" | "university" | "work_mode" | "date";

type AttendanceReportRow = Awaited<ReturnType<typeof listAttendance>>[number];

const GROUP_LABELS: Record<ReportGroupBy, string> = {
  user: "User",
  department: "Department",
  university: "University",
  work_mode: "Work mode",
  date: "Date",
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function numericHours(row: AttendanceReportRow) {
  return Number(row.total_hours || 0);
}

function attendanceCode(row: AttendanceReportRow) {
  return row.employee_code || row.intern_code || "-";
}

function groupKey(row: AttendanceReportRow, groupBy: ReportGroupBy) {
  if (groupBy === "user") return `${attendanceCode(row)} / ${row.full_name || "-"}`;
  if (groupBy === "department") return row.department || "-";
  if (groupBy === "university") return row.university || "-";
  if (groupBy === "work_mode") return row.work_mode || "-";
  return row.check_in_date || "-";
}

export function normalizeReportGroupBy(value: string | null | undefined): ReportGroupBy {
  if (value === "department" || value === "university" || value === "work_mode" || value === "date") return value;
  return "user";
}

export function buildReportGroups(rows: AttendanceReportRow[], groupBy: ReportGroupBy) {
  const groups = new Map<string, {
    group: string;
    records: number;
    interns: Set<string>;
    checkedOut: number;
    late: number;
    totalHours: number;
    firstDate: string;
    lastDate: string;
  }>();

  rows.forEach((row) => {
    const key = groupKey(row, groupBy);
    const current = groups.get(key) || {
      group: key,
      records: 0,
      interns: new Set<string>(),
      checkedOut: 0,
      late: 0,
      totalHours: 0,
      firstDate: "",
      lastDate: "",
    };
    current.records += 1;
    current.interns.add(row.user_id || attendanceCode(row));
    current.checkedOut += row.status === "checked_out" ? 1 : 0;
    current.late += row.is_late ? 1 : 0;
    current.totalHours += numericHours(row);
    current.firstDate = !current.firstDate || row.check_in_date < current.firstDate ? row.check_in_date : current.firstDate;
    current.lastDate = row.check_in_date > current.lastDate ? row.check_in_date : current.lastDate;
    groups.set(key, current);
  });

  return Array.from(groups.values())
    .map((group) => ({
      group: group.group,
      records: group.records,
      interns: group.interns.size,
      checkedOut: group.checkedOut,
      late: group.late,
      totalHours: Math.round(group.totalHours * 100) / 100,
      firstDate: group.firstDate,
      lastDate: group.lastDate,
    }))
    .sort((a, b) => b.totalHours - a.totalHours || a.group.localeCompare(b.group));
}

export async function createAttendanceReportSheet(
  sessionUser: SessionUser,
  filters: { q?: string; from?: string; to?: string; groupBy?: string },
) {
  if (sessionUser.role !== "admin") throw new Error("Admin only");

  const groupBy = normalizeReportGroupBy(filters.groupBy);
  const rows = await listAttendance(sessionUser, {
    q: text(filters.q),
    from: text(filters.from),
    to: text(filters.to),
  });
  const groups = buildReportGroups(rows, groupBy);
  const title = `PMC Intern Report ${GROUP_LABELS[groupBy]} ${new Date().toISOString().slice(0, 10)}`;

  const sheets = getSheetsClient();
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [
        { properties: { title: "Summary" } },
        { properties: { title: "Raw data" } },
      ],
    },
    fields: "spreadsheetId,spreadsheetUrl",
  });

  const spreadsheetId = created.data.spreadsheetId || "";
  if (!spreadsheetId) throw new Error("ไม่สามารถสร้าง Google Sheet รายงานได้");

  const summaryValues = [
    [`Group by: ${GROUP_LABELS[groupBy]}`],
    [`Created at: ${new Date().toISOString()}`],
    [`Filters: ${filters.from || "all"} to ${filters.to || "all"} / ${filters.q || "all"}`],
    [],
    ["Group", "Records", "Interns", "Checked out", "Late", "Total hours", "First date", "Last date"],
    ...groups.map((group) => [
      group.group,
      group.records,
      group.interns,
      group.checkedOut,
      group.late,
      group.totalHours,
      group.firstDate,
      group.lastDate,
    ]),
  ];

  const rawValues = [
    [
      "Date",
      "Code",
      "Name",
      "Department",
      "University",
      "Work mode",
      "Check in",
      "Check out",
      "Hours",
      "Status",
      "Late",
      "Location",
      "Notes",
    ],
    ...rows.map((row) => [
      row.check_in_date,
      attendanceCode(row),
      row.full_name,
      row.department || "",
      row.university || "",
      row.work_mode || "",
      row.check_in_time || "",
      row.check_out_time || "",
      numericHours(row),
      row.status || "",
      row.is_late ? "yes" : "no",
      row.location_address || "",
      row.notes || "",
    ]),
  ];

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: "'Summary'!A1:H10000", values: summaryValues },
        { range: "'Raw data'!A1:M10000", values: rawValues },
      ],
    },
  });

  try {
    const drive = getDriveClient();
    await drive.files.update({
      fileId: spreadsheetId,
      addParents: env.google.driveRootFolderId,
      fields: "id,webViewLink",
      supportsAllDrives: true,
    });
  } catch {
    // The sheet is still created even if Workspace policy blocks moving it into the configured folder.
  }

  return {
    spreadsheetId,
    url: created.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    title,
    groupBy,
    rows: rows.length,
    groups: groups.length,
  };
}
