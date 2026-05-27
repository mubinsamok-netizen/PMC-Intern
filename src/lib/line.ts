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

type LineCheckoutReminderPayload = {
  date: string;
  reminderTime?: string;
  totalCheckedIn: number;
  pendingCount: number;
  pendingNames: string[];
};

type FlexComponent = Record<string, unknown>;
type FlexContainer = Record<string, unknown>;

type LineMessage =
  | { type: "text"; text: string }
  | { type: "flex"; altText: string; contents: FlexContainer };

type LinePushOptions = {
  force?: boolean;
  targetGroupId?: string;
};

const colors = {
  brand: "#E84924",
  ink: "#1F2937",
  muted: "#667085",
  line: "#E8D5CD",
  warning: "#F59B2E",
  surface: "#FFFFFF",
  success: "#0E9F6E",
  sky: "#2F80ED",
  danger: "#DC2626",
  purple: "#7C3AED",
};

const heroImages = {
  default: env.line.cardHeroImageUrl || `${env.publicAppUrl}/line-checkout-bg.jpg`,
  checkin: env.line.checkinHeroImageUrl || env.line.cardHeroImageUrl || `${env.publicAppUrl}/line-checkin-bg.jpg`,
  site: env.line.siteHeroImageUrl || env.line.cardHeroImageUrl || `${env.publicAppUrl}/line-site-bg.jpg`,
  leave: env.line.leaveHeroImageUrl || env.line.cardHeroImageUrl || `${env.publicAppUrl}/line-leave-bg.jpg`,
  checkout: env.line.checkoutHeroImageUrl || env.line.cardHeroImageUrl || `${env.publicAppUrl}/line-checkout-bg.jpg`,
};

async function pushLine(message: LineMessage, options: LinePushOptions = {}) {
  const targetGroupId = options.targetGroupId || env.line.groupId;
  if ((!env.line.enabled && !options.force) || !env.line.channelAccessToken || !targetGroupId) {
    return {
      skipped: true,
      reason: !env.line.enabled && !options.force
        ? "LINE is disabled"
        : !env.line.channelAccessToken
          ? "Missing LINE channel access token"
          : "Missing LINE group id",
    };
  }

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.line.channelAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: targetGroupId,
      messages: [message],
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

function dateRangeText(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return "-";
  if (startDate && endDate && startDate !== endDate) return `${formatThaiDate(startDate)} - ${formatThaiDate(endDate)}`;
  return formatThaiDate(startDate || endDate || "");
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

function makeLineCard(options: {
  altText: string;
  title: string;
  subtitle: string;
  bigValue: string;
  emoji: string;
  rows: FlexComponent[];
  note?: string;
  accentColor?: string;
  compactHeader?: boolean;
  heroImageUrl?: string;
}): LineMessage {
  const accent = options.accentColor || colors.brand;
  const heroImageUrl = options.heroImageUrl || heroImages.default;
  const iconSize = options.compactHeader ? "34px" : "40px";
  const iconRadius = options.compactHeader ? "17px" : "20px";
  const iconTextSize = options.compactHeader ? "lg" : "xl";

  const detailContents: FlexComponent[] = [
    ...options.rows,
    {
      type: "separator",
      margin: "md",
      color: colors.line,
    },
  ];

  if (options.note) {
    detailContents.push(flexText(options.note, {
      size: "sm",
      color: colors.muted,
      align: "center",
      margin: "sm",
    }));
  }

  const contents: FlexContainer = {
    type: "bubble",
    size: "giga",
    styles: {
      hero: { separator: false },
      body: { backgroundColor: colors.surface },
    },
    hero: {
      type: "image",
      url: heroImageUrl,
      size: "full",
      aspectRatio: "20:7",
      aspectMode: "cover",
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "0px",
      contents: [
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          paddingTop: "18px",
          paddingBottom: "16px",
          paddingStart: "18px",
          paddingEnd: "18px",
          backgroundColor: colors.surface,
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
                  spacing: "xs",
                  contents: [
                    flexText(options.title, {
                      size: "xs",
                      weight: "bold",
                      color: accent,
                      adjustMode: "shrink-to-fit",
                      maxLines: 1,
                    }),
                    flexText(options.bigValue, {
                      size: options.compactHeader ? "md" : "xl",
                      weight: "bold",
                      color: colors.ink,
                      margin: "sm",
                      maxLines: 2,
                      adjustMode: options.compactHeader ? "shrink-to-fit" : undefined,
                    }),
                    flexText(options.subtitle, {
                      size: "xs",
                      color: colors.muted,
                      margin: "xs",
                      adjustMode: "shrink-to-fit",
                      maxLines: 1,
                    }),
                  ],
                },
                {
                  type: "box",
                  layout: "vertical",
                  flex: 0,
                  width: iconSize,
                  height: iconSize,
                  margin: "md",
                  backgroundColor: "#F8FAFC",
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
              ],
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
          contents: detailContents,
        },
      ],
    },
  };

  return {
    type: "flex",
    altText: options.altText,
    contents,
  };
}

export async function notifyLineCheckOutReminder(
  record: LineCheckoutReminderPayload,
  options: LinePushOptions = {},
) {
  const hasPending = record.pendingCount > 0;

  return pushLine(makeLineCard({
    altText: "อย่าลืม Check out ก่อนกลับนะครับ",
    title: "CHECK OUT REMINDER",
    bigValue: hasPending ? "อย่าลืม Check out นะครับ" : "วันนี้เรียบร้อยครบแล้ว",
    subtitle: hasPending ? "ขอบคุณสำหรับวันนี้ เก่งมาก ๆ ครับ" : "ขอบคุณทุกคนสำหรับวันนี้ครับ",
    emoji: hasPending ? "🌙" : "✨",
    rows: [
      infoRow("วันที่", formatThaiDate(record.date), true),
      infoRow("เวลาเตือน", record.reminderTime || "-", false),
      infoRow("สถานะ", hasPending ? `${record.pendingCount}/${record.totalCheckedIn} ยังไม่ออก` : "ทุกคนออกครบแล้ว", true),
    ],
    note: hasPending
      ? "ขอบคุณสำหรับความตั้งใจวันนี้นะครับ ก่อนกลับอย่าลืม Check out แล้วเดินทางกลับบ้านปลอดภัยครับ"
      : "ขอบคุณทุกคนมากครับ ขอให้พักผ่อนให้เต็มที่ แล้วพบกันวันทำงานถัดไปครับ",
    accentColor: hasPending ? colors.sky : colors.success,
    heroImageUrl: heroImages.checkout,
  }), options);
}

export async function notifyLineCheckIn(
  record: LineAttendancePayload,
  options: LinePushOptions = {},
) {
  return pushLine(makeLineCard({
    altText: `เช็คอิน: ${record.full_name}`,
    title: "CHECK IN",
    bigValue: "เช็คอินแล้ว",
    subtitle: "บันทึกการเข้างานเรียบร้อย",
    emoji: record.is_late ? "!" : "☀️",
    rows: [
      infoRow("ชื่อ", record.full_name, true),
      infoRow("วันที่", formatThaiDate(record.check_in_date)),
      infoRow("รูปแบบ", record.work_mode || "-"),
      infoRow("สถานที่", record.location_address || "-"),
    ],
    note: record.is_late
      ? "บันทึกเช็คอินแล้ว วันนี้มาสายนิดหน่อย แต่ขอให้ทำงานราบรื่นนะครับ"
      : "ขอให้วันนี้เป็นวันที่ดีในการฝึกงานนะครับ",
    accentColor: record.is_late ? colors.warning : colors.brand,
    heroImageUrl: heroImages.checkin,
  }), options);
}

export async function notifyLineSiteVisit(
  record: LineSiteVisitPayload,
  options: LinePushOptions = {},
) {
  return pushLine(makeLineCard({
    altText: `ไปไซต์งาน: ${record.full_name || "-"}`,
    title: "SITE VISIT",
    bigValue: "เพิ่มไซต์ระหว่างวัน",
    subtitle: "บันทึกสถานที่ปฏิบัติงานเพิ่มเติม",
    emoji: "📍",
    compactHeader: true,
    rows: [
      infoRow("ชื่อ", record.full_name || "-", true),
      infoRow("วันที่", formatThaiDate(record.check_in_date)),
      infoRow("สถานที่", record.location_address || record.site_name || "-"),
    ],
    note: "เดินทางปลอดภัยและขอให้ทำงานราบรื่นนะครับ",
    accentColor: colors.purple,
    heroImageUrl: heroImages.site,
  }), options);
}

export async function notifyLineLeaveRequest(record: LineLeaveRequestPayload) {
  return pushLine(makeLineCard({
    altText: `คำขอลาใหม่: ${record.full_name}`,
    title: "LEAVE REQUEST",
    bigValue: "มีคำขอลาใหม่",
    subtitle: "รอผู้ดูแลระบบตรวจสอบในระบบ",
    emoji: "📝",
    rows: [
      infoRow("สถานะ", "รอตรวจสอบ", true),
    ],
    note: "รายละเอียดคำขอลาอยู่ในระบบ",
    accentColor: colors.brand,
    heroImageUrl: heroImages.leave,
  }));
}

export async function notifyLineLeaveReview(
  record: LineLeaveRequestPayload,
  options: LinePushOptions = {},
) {
  const approved = record.status === "approved";
  const accent = approved ? colors.success : colors.danger;
  const rows: FlexComponent[] = [];

  if (record.reviewed_by) rows.push(infoRow("ผู้อนุมัติ", record.reviewed_by, false));
  if (rows.length === 0) rows.push(infoRow("สถานะ", approved ? "อนุมัติแล้ว" : "ไม่อนุมัติ", true));

  return pushLine(makeLineCard({
    altText: approved ? `อนุมัติการลา: ${record.full_name}` : `ผลการพิจารณาการลา: ${record.full_name}`,
    title: "LEAVE REQUEST",
    bigValue: approved ? "อนุมัติการลาแล้ว" : "ไม่อนุมัติการลา",
    subtitle: approved ? "รับทราบผลการอนุมัติเรียบร้อยครับ" : "มีผลการพิจารณาคำขอลาแล้วครับ",
    emoji: approved ? "✅" : "!",
    rows,
    accentColor: accent,
    heroImageUrl: heroImages.leave,
  }), options);
}
