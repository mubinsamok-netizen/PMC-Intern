import { env } from "@/lib/env";

type LineAttendancePayload = {
  full_name: string;
  employee_code?: string;
  intern_code?: string;
  department?: string;
  check_in_date: string;
  check_in_time: string;
  check_out_time?: string;
  work_mode?: string;
  location_address?: string;
  total_hours_display?: string;
  is_late?: boolean;
};

type LineLeaveRequestPayload = {
  full_name: string;
  employee_code?: string;
  intern_code?: string;
  department?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  status?: string;
  admin_note?: string;
  reviewed_by?: string;
};

type LineSummaryPayload = {
  date: string;
  activeInterns: number;
  checkedIn: number;
  checkedOut: number;
  late: number;
  missingCheckIn: number;
  pendingLeave: number;
  approvedLeaveToday: number;
};

type LineReminderPayload = {
  date: string;
  names: string[];
};

async function pushLine(text: string) {
  if (!env.line.enabled || !env.line.channelAccessToken || !env.line.groupId) return { skipped: true };

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.line.channelAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: env.line.groupId,
      messages: [{ type: "text", text }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LINE push failed: ${res.status} ${body}`);
  }
  return { skipped: false };
}

function codeOf(record: { intern_code?: string; employee_code?: string }) {
  return record.intern_code || record.employee_code || "-";
}

function leaveStatusText(status?: string) {
  if (status === "approved") return "อนุมัติแล้ว";
  if (status === "rejected") return "ไม่อนุมัติ";
  return "รอตรวจ";
}

function nameList(names: string[]) {
  if (names.length === 0) return "-";
  return names.slice(0, 20).map((name, index) => `${index + 1}. ${name}`).join("\n");
}

export async function notifyLineCheckIn(record: LineAttendancePayload) {
  const late = record.is_late ? "\nสถานะ: สาย" : "\nสถานะ: ตรงเวลา";
  return pushLine([
    "PMC Intern Attendance",
    "แจ้งเช็คอินนักศึกษาฝึกงาน",
    "",
    `ชื่อ: ${record.full_name}`,
    `รหัส: ${codeOf(record)}`,
    `แผนก: ${record.department || "-"}`,
    `วันที่: ${record.check_in_date}`,
    `เวลาเข้า: ${record.check_in_time}`,
    `รูปแบบ: ${record.work_mode || "-"}`,
    `สถานที่: ${record.location_address || "-"}`,
    late,
  ].join("\n"));
}

export async function notifyLineCheckOut(record: LineAttendancePayload) {
  return pushLine([
    "PMC Intern Attendance",
    "แจ้งเช็คเอาท์นักศึกษาฝึกงาน",
    "",
    `ชื่อ: ${record.full_name}`,
    `รหัส: ${codeOf(record)}`,
    `วันที่: ${record.check_in_date}`,
    `เวลาเข้า: ${record.check_in_time}`,
    `เวลาออก: ${record.check_out_time || "-"}`,
    `รวมเวลา: ${record.total_hours_display || "-"}`,
    `สถานที่: ${record.location_address || "-"}`,
  ].join("\n"));
}

export async function notifyLineLeaveRequest(record: LineLeaveRequestPayload) {
  return pushLine([
    "PMC Intern Leave",
    "มีคำขอลาใหม่",
    "",
    `ชื่อ: ${record.full_name}`,
    `รหัส: ${codeOf(record)}`,
    `แผนก: ${record.department || "-"}`,
    `ประเภท: ${record.leave_type}`,
    `ช่วงวันที่: ${record.start_date} ถึง ${record.end_date}`,
    `จำนวน: ${record.total_days} วัน`,
    "เหตุผล: ดูรายละเอียดในระบบเท่านั้น",
    "สถานะ: รอตรวจ",
  ].join("\n"));
}

export async function notifyLineLeaveReview(record: LineLeaveRequestPayload) {
  return pushLine([
    "PMC Intern Leave",
    `ผลคำขอลา: ${leaveStatusText(record.status)}`,
    "",
    `ชื่อ: ${record.full_name}`,
    `รหัส: ${codeOf(record)}`,
    `ประเภท: ${record.leave_type}`,
    `ช่วงวันที่: ${record.start_date} ถึง ${record.end_date}`,
    `จำนวน: ${record.total_days} วัน`,
    `ผู้ตรวจ: ${record.reviewed_by || "-"}`,
    "หมายเหตุ: ดูรายละเอียดในระบบเท่านั้น",
  ].join("\n"));
}

export async function notifyLineDailySummary(summary: LineSummaryPayload) {
  return pushLine([
    "PMC Intern Daily Summary",
    `สรุปประจำวันที่ ${summary.date}`,
    "",
    `นักศึกษาที่ใช้งาน: ${summary.activeInterns} คน`,
    `เช็คอินแล้ว: ${summary.checkedIn} คน`,
    `เช็คเอาท์แล้ว: ${summary.checkedOut} คน`,
    `มาสาย: ${summary.late} คน`,
    `ยังไม่เช็คอิน: ${summary.missingCheckIn} คน`,
    `ลาที่อนุมัติวันนี้: ${summary.approvedLeaveToday} คน`,
    `คำขอลารอตรวจ: ${summary.pendingLeave} รายการ`,
  ].join("\n"));
}

export async function notifyLineCheckInReminder(payload: LineReminderPayload) {
  if (payload.names.length === 0) return { skipped: true };
  return pushLine([
    "PMC Intern Reminder",
    `ยังไม่เช็คอินประจำวันที่ ${payload.date}`,
    "",
    nameList(payload.names),
  ].join("\n"));
}

export async function notifyLineCheckOutReminder(payload: LineReminderPayload) {
  if (payload.names.length === 0) return { skipped: true };
  return pushLine([
    "PMC Intern Reminder",
    `ยังไม่เช็คเอาท์ประจำวันที่ ${payload.date}`,
    "",
    nameList(payload.names),
  ].join("\n"));
}
