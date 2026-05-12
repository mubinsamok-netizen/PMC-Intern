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

type LineSiteVisitPayload = {
  full_name?: string;
  check_in_date: string;
  site_name?: string;
  location_address?: string;
};

type FlexComponent = Record<string, unknown>;
type FlexContainer = Record<string, unknown>;

type LineMessage =
  | { type: "text"; text: string }
  | { type: "flex"; altText: string; contents: FlexContainer };

const colors = {
  brand: "#E84924",
  brandSoft: "#FFF7F3",
  ink: "#1F2937",
  muted: "#667085",
  line: "#E8D5CD",
  warning: "#F59B2E",
  surface: "#FFFFFF",
  headerText: "#FFFFFF",
  headerMuted: "#FFE7DD",
};

async function pushLine(message: LineMessage) {
  if (!env.line.enabled || !env.line.channelAccessToken || !env.line.groupId) return { skipped: true };

  const messages: LineMessage[] = [message];

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
    spacing: "md",
    alignItems: "flex-start",
    contents: [
      {
        type: "box",
        layout: "vertical",
        width: "72px",
        flex: 0,
        contents: [
          flexText(label, {
            size: "sm",
            color: colors.muted,
          }),
        ],
      },
      flexText(value || "-", {
        size: "sm",
        weight: strong ? "bold" : "regular",
        align: "end",
        flex: 1,
        color: colors.ink,
        adjustMode: "shrink-to-fit",
      }),
    ],
  };
}

function makeCuteCard(options: {
  altText: string;
  title: string;
  subtitle: string;
  bigValue: string;
  emoji: string;
  rows: FlexComponent[];
  note?: string;
  accentColor?: string;
  compactHeader?: boolean;
}): LineMessage {
  const accent = options.accentColor || colors.brand;
  const headerTexts: FlexComponent[] = [];
  if (options.title) {
    headerTexts.push(flexText(options.title, {
      size: "xs",
      weight: "bold",
      color: colors.headerMuted,
      adjustMode: "shrink-to-fit",
      maxLines: 1,
    }));
  }
  if (options.bigValue) {
    headerTexts.push(flexText(options.bigValue, {
      size: options.compactHeader ? "md" : "xl",
      weight: "bold",
      color: colors.headerText,
      margin: options.title ? "sm" : undefined,
      maxLines: 2,
      adjustMode: options.compactHeader ? "shrink-to-fit" : undefined,
    }));
  }
  if (options.subtitle) {
    headerTexts.push(flexText(options.subtitle, {
      size: "xs",
      color: colors.headerMuted,
      margin: "xs",
      adjustMode: "shrink-to-fit",
      maxLines: 1,
    }));
  }
  const iconSize = options.compactHeader ? "34px" : "40px";
  const iconRadius = options.compactHeader ? "17px" : "20px";
  const iconTextSize = options.compactHeader ? "lg" : "xl";
  const headerContents: FlexComponent[] = [
    {
      type: "box",
      layout: "vertical",
      flex: 1,
      spacing: "xs",
      contents: headerTexts,
    },
    {
      type: "box",
      layout: "vertical",
      flex: 0,
      width: iconSize,
      height: iconSize,
      margin: "md",
      backgroundColor: colors.surface,
      cornerRadius: iconRadius,
      alignItems: "center",
      justifyContent: "center",
      contents: [
        flexText(options.emoji, {
          size: iconTextSize,
          weight: "bold",
          align: "center",
          color: accent,
        }),
      ],
    },
  ];
  const bodyContents: FlexComponent[] = [
    {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingTop: "18px",
      paddingBottom: "16px",
      paddingStart: "18px",
      paddingEnd: "18px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          alignItems: "center",
          contents: headerContents,
        },
      ],
    },
    {
      type: "box",
      layout: "vertical",
      paddingTop: "16px",
      paddingBottom: "16px",
      paddingStart: "18px",
      paddingEnd: "18px",
      spacing: "md",
      backgroundColor: colors.surface,
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
        margin: "sm",
      }),
    ];
  }

  return {
    type: "flex",
    altText: options.altText,
    contents: {
      type: "bubble",
      size: "giga",
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
    title: "",
    bigValue: "เช็คอินแล้ว",
    subtitle: "บันทึกการเข้างานเรียบร้อย",
    emoji: "🌤️",
    rows: [
      infoRow("ชื่อ", record.full_name, true),
      infoRow("วันที่", formatThaiDate(record.check_in_date)),
      infoRow("รูปแบบ", record.work_mode || "-"),
      infoRow("สถานที่", record.location_address || "-"),
    ],
    note: "ขอให้วันนี้เป็นวันที่ดีในการฝึกงานนะครับ",
    accentColor: record.is_late ? colors.warning : colors.brand,
  }));
}

export async function notifyLineSiteVisit(record: LineSiteVisitPayload) {
  return pushLine(makeCuteCard({
    altText: `ไปไซต์งาน: ${record.full_name || "-"}`,
    title: "",
    bigValue: "นักศึกษาเพิ่มไซต์ระหว่างวัน",
    subtitle: "",
    emoji: "📍",
    compactHeader: true,
    rows: [
      infoRow("ชื่อ", record.full_name || "-", true),
      infoRow("วันที่", formatThaiDate(record.check_in_date)),
      infoRow("สถานที่", record.location_address || record.site_name || "-"),
    ],
    note: "เดินทางปลอดภัยและขอให้ทำงานราบรื่นนะครับ",
  }));
}

export async function notifyLineLeaveRequest(_record: LineLeaveRequestPayload) {
  return pushLine(makeCuteCard({
    altText: "คำขอลาใหม่",
    title: "คำขอลาใหม่",
    bigValue: "มีคำขอลา",
    subtitle: "รอผู้ดูแลระบบตรวจสอบในระบบ",
    emoji: "📝",
    rows: [
      infoRow("สถานะ", "มีคำขอลาใหม่", true),
    ],
    note: "รายละเอียดอยู่ในระบบ",
  }));
}
