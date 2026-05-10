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

type LineSticker = {
  packageId: string;
  stickerId: string;
};

type FlexComponent = Record<string, unknown>;
type FlexContainer = Record<string, unknown>;

type LineMessage =
  | { type: "text"; text: string }
  | { type: "flex"; altText: string; contents: FlexContainer }
  | { type: "sticker"; packageId: string; stickerId: string };

const colors = {
  brand: "#E84924",
  brandDark: "#B32017",
  brandSoft: "#FFF5F1",
  ink: "#20242C",
  muted: "#6F7787",
  line: "#F2D3CA",
  warning: "#F59B2E",
};

function sticker(stickerId: string): LineSticker | undefined {
  if (!env.line.stickerPackageId || !stickerId) return undefined;
  return { packageId: env.line.stickerPackageId, stickerId };
}

async function pushLine(message: LineMessage, lineSticker?: LineSticker) {
  if (!env.line.enabled || !env.line.channelAccessToken || !env.line.groupId) return { skipped: true };

  const messages: LineMessage[] = [message];
  if (lineSticker) {
    messages.push({ type: "sticker", packageId: lineSticker.packageId, stickerId: lineSticker.stickerId });
  }

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.line.channelAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: env.line.groupId,
      messages,
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

function checkInStatus(record: LineAttendancePayload) {
  return record.is_late ? "เช็คอินล่าช้า" : "ตรงเวลา พร้อมเริ่มงาน";
}

function formatThaiDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "-";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: env.timezone,
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function nameList(names: string[]) {
  if (names.length === 0) return "-";
  const limited = names.slice(0, 20).map((name, index) => `${index + 1}. ${name}`).join("\n");
  if (names.length <= 20) return limited;
  return `${limited}\nและอีก ${names.length - 20} คน`;
}

function flexText(text: string, options: Record<string, unknown> = {}): FlexComponent {
  return {
    type: "text",
    text,
    wrap: true,
    color: colors.ink,
    ...options,
  };
}

function infoRow(label: string, value: string, strong = false): FlexComponent {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: [
      flexText(label, {
        size: "sm",
        color: colors.muted,
        flex: 5,
      }),
      flexText(value || "-", {
        size: "sm",
        weight: strong ? "bold" : "regular",
        align: "end",
        flex: 7,
      }),
    ],
  };
}

function makeButton(label: string, text: string, color = colors.brandDark): FlexComponent {
  return {
    type: "button",
    style: "primary",
    height: "sm",
    color,
    action: {
      type: "message",
      label,
      text,
    },
  };
}

function makeCuteCard(options: {
  altText: string;
  title: string;
  subtitle: string;
  bigValue: string;
  mascot?: string;
  rows: FlexComponent[];
  note?: string;
  buttonLabel?: string;
  buttonText?: string;
  accentColor?: string;
}): LineMessage {
  const accent = options.accentColor || colors.brand;
  const bodyContents: FlexComponent[] = [
    {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "16px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          alignItems: "center",
          contents: [
            {
              type: "box",
              layout: "vertical",
              flex: 1,
              contents: [
                flexText(options.title, { size: "sm", weight: "bold", color: "#FFFFFF" }),
                flexText(options.bigValue, { size: "xxl", weight: "bold", color: "#FFFFFF", margin: "sm" }),
                flexText(options.subtitle, { size: "xs", color: "#EFFFFC", margin: "xs" }),
              ],
            },
            flexText(options.mascot || "🐧", {
              flex: 0,
              size: "4xl",
              align: "end",
            }),
          ],
        },
      ],
    },
    {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      spacing: "sm",
      backgroundColor: colors.brandSoft,
      contents: [
        ...options.rows,
        {
          type: "separator",
          margin: "md",
          color: colors.line,
        },
      ],
    },
  ];

  if (options.note) {
    bodyContents[1].contents = [
      ...(bodyContents[1].contents as FlexComponent[]),
      flexText(options.note, {
        size: "sm",
        color: colors.muted,
        align: "center",
        margin: "md",
      }),
    ];
  }

  if (options.buttonLabel && options.buttonText) {
    bodyContents[1].contents = [
      ...(bodyContents[1].contents as FlexComponent[]),
      makeButton(options.buttonLabel, options.buttonText, accent === colors.warning ? colors.warning : colors.brandDark),
    ];
  }

  return {
    type: "flex",
    altText: options.altText,
    contents: {
      type: "bubble",
      size: "kilo",
      styles: {
        body: { backgroundColor: accent },
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "0px",
        contents: bodyContents,
      },
    },
  };
}

export async function notifyLineCheckIn(record: LineAttendancePayload) {
  return pushLine(makeCuteCard({
    altText: `เช็คอิน: ${record.full_name}`,
    title: "เช็คอิน",
    bigValue: record.check_in_time || "-",
    subtitle: record.is_late ? "เข้าระบบล่าช้าเล็กน้อย" : "พร้อมเริ่มวันฝึกงาน",
    mascot: record.is_late ? "🐧💦" : "🐧",
    rows: [
      infoRow("ชื่อ", record.full_name, true),
      infoRow("รหัส", codeOf(record)),
      infoRow("แผนก", record.department || "-"),
      infoRow("วันที่", formatThaiDate(record.check_in_date)),
      infoRow("รูปแบบ", record.work_mode || "-"),
      infoRow("สถานะ", checkInStatus(record), true),
    ],
    note: record.location_address ? `สถานที่: ${record.location_address}` : "ยังไม่ได้ระบุสถานที่",
    buttonLabel: "รับทราบ",
    buttonText: "รับทราบเช็คอิน",
    accentColor: record.is_late ? colors.warning : colors.brand,
  }), sticker(env.line.stickerCheckInId));
}

export async function notifyLineCheckOut(record: LineAttendancePayload) {
  return pushLine(makeCuteCard({
    altText: `เช็คเอาท์: ${record.full_name}`,
    title: "เช็คเอาท์",
    bigValue: record.total_hours_display || "-",
    subtitle: "บันทึกชั่วโมงฝึกงานวันนี้แล้ว",
    mascot: "🐧✨",
    rows: [
      infoRow("ชื่อ", record.full_name, true),
      infoRow("รหัส", codeOf(record)),
      infoRow("วันที่", formatThaiDate(record.check_in_date)),
      infoRow("เวลาเข้า", record.check_in_time || "-"),
      infoRow("เวลาออก", record.check_out_time || "-"),
      infoRow("รวมเวลา", record.total_hours_display || "-", true),
    ],
    note: "ขอบคุณสำหรับวันนี้ครับ",
    buttonLabel: "ปิดงานวันนี้",
    buttonText: "รับทราบเช็คเอาท์",
  }), sticker(env.line.stickerCheckOutId));
}

export async function notifyLineLeaveRequest(record: LineLeaveRequestPayload) {
  return pushLine(makeCuteCard({
    altText: `คำขอลาใหม่: ${record.full_name}`,
    title: "คำขอลาใหม่",
    bigValue: `${record.total_days} วัน`,
    subtitle: "รอผู้ดูแลระบบตรวจสอบ",
    mascot: "🐧📄",
    rows: [
      infoRow("ชื่อ", record.full_name, true),
      infoRow("รหัส", codeOf(record)),
      infoRow("แผนก", record.department || "-"),
      infoRow("ประเภท", record.leave_type, true),
      infoRow("เริ่ม", formatThaiDate(record.start_date)),
      infoRow("ถึง", formatThaiDate(record.end_date)),
    ],
    note: "เหตุผลจะแสดงเฉพาะในระบบเพื่อความเป็นส่วนตัว",
    buttonLabel: "ตรวจคำขอ",
    buttonText: "ตรวจคำขอลา",
  }), sticker(env.line.stickerLeaveId));
}

export async function notifyLineLeaveReview(record: LineLeaveRequestPayload) {
  const approved = record.status === "approved";
  return pushLine(makeCuteCard({
    altText: `ผลคำขอลา: ${record.full_name}`,
    title: "ผลคำขอลา",
    bigValue: leaveStatusText(record.status),
    subtitle: approved ? "คำขอได้รับการอนุมัติแล้ว" : "อัปเดตผลการตรวจคำขอ",
    mascot: approved ? "🐧✅" : "🐧📌",
    rows: [
      infoRow("ชื่อ", record.full_name, true),
      infoRow("รหัส", codeOf(record)),
      infoRow("ประเภท", record.leave_type),
      infoRow("จำนวน", `${record.total_days} วัน`, true),
      infoRow("ผู้ตรวจ", record.reviewed_by || "-"),
    ],
    note: "หมายเหตุจะแสดงเฉพาะในระบบเพื่อความเป็นส่วนตัว",
    buttonLabel: "รับทราบ",
    buttonText: "รับทราบผลคำขอลา",
    accentColor: approved ? colors.brand : colors.warning,
  }), sticker(env.line.stickerLeaveId));
}

export async function notifyLineDailySummary(summary: LineSummaryPayload) {
  return pushLine(makeCuteCard({
    altText: `สรุปการฝึกงาน ${formatThaiDate(summary.date)}`,
    title: "สรุปวันนี้",
    bigValue: `${summary.checkedIn}/${summary.activeInterns}`,
    subtitle: "เช็คอินแล้วจากนักศึกษาที่ใช้งาน",
    mascot: "🐧📊",
    rows: [
      infoRow("เช็คอินแล้ว", `${summary.checkedIn} คน`, true),
      infoRow("เช็คเอาท์แล้ว", `${summary.checkedOut} คน`),
      infoRow("เช็คอินล่าช้า", `${summary.late} คน`),
      infoRow("ยังไม่เช็คอิน", `${summary.missingCheckIn} คน`, summary.missingCheckIn > 0),
      infoRow("ลาที่อนุมัติวันนี้", `${summary.approvedLeaveToday} คน`),
      infoRow("คำขอลารอตรวจ", `${summary.pendingLeave} รายการ`, summary.pendingLeave > 0),
    ],
    note: `ประจำวันที่ ${formatThaiDate(summary.date)}`,
    buttonLabel: "ดูสรุป",
    buttonText: "ดูสรุปการฝึกงาน",
  }), sticker(env.line.stickerSummaryId));
}

export async function notifyLineCheckInReminder(payload: LineReminderPayload) {
  if (payload.names.length === 0) return { skipped: true };
  return pushLine(makeCuteCard({
    altText: `เตือนเช็คอิน ${payload.names.length} คน`,
    title: "เตือนเช็คอิน",
    bigValue: `${payload.names.length} คน`,
    subtitle: "ยังไม่พบการเช็คอินวันนี้",
    mascot: "🐧🔔",
    rows: [
      flexText(nameList(payload.names), {
        size: "sm",
        weight: "bold",
        color: colors.ink,
      }),
    ],
    note: `ประจำวันที่ ${formatThaiDate(payload.date)}`,
    buttonLabel: "รับทราบ",
    buttonText: "รับทราบเตือนเช็คอิน",
    accentColor: colors.warning,
  }), sticker(env.line.stickerReminderId));
}

export async function notifyLineCheckOutReminder(payload: LineReminderPayload) {
  if (payload.names.length === 0) return { skipped: true };
  return pushLine(makeCuteCard({
    altText: `เตือนเช็คเอาท์ ${payload.names.length} คน`,
    title: "เตือนเช็คเอาท์",
    bigValue: `${payload.names.length} คน`,
    subtitle: "ยังไม่พบการเช็คเอาท์วันนี้",
    mascot: "🐧🔔",
    rows: [
      flexText(nameList(payload.names), {
        size: "sm",
        weight: "bold",
        color: colors.ink,
      }),
    ],
    note: `ประจำวันที่ ${formatThaiDate(payload.date)}`,
    buttonLabel: "รับทราบ",
    buttonText: "รับทราบเตือนเช็คเอาท์",
    accentColor: colors.warning,
  }), sticker(env.line.stickerReminderId));
}
