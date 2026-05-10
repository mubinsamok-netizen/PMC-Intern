import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { getChatbotSettings, updateChatbotSettings } from "@/lib/chatbot-settings";
import { runLineAutomation } from "@/lib/line-automation";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { isWorkday, listHolidays } from "@/lib/workdays";

export const runtime = "nodejs";

function requireAdmin(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user || user.role !== "admin") return null;
  return user;
}

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

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  const today = bangkokDate();
  const [settings, holidays, todayIsWorkday] = await Promise.all([
    getChatbotSettings(),
    listHolidays(),
    isWorkday(today),
  ]);

  return NextResponse.json({
    ok: true,
    settings,
    holidays,
    today: { date: today, isWorkday: todayIsWorkday },
  });
}

export async function PATCH(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const settings = await updateChatbotSettings(body.settings || body, admin.full_name || admin.email);
    writeAuditLogSafe({
      user: admin,
      action: "UPDATE_CHATBOT_SETTINGS",
      targetType: "chatbot",
      details: settings,
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "all");
    const date = body.date ? String(body.date) : undefined;
    const result = await runLineAutomation(action, date, { force: true });
    writeAuditLogSafe({
      user: admin,
      action: "TEST_LINE_CHATBOT",
      targetType: "chatbot",
      targetId: action,
      details: { date: date || "", result },
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
