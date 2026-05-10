import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { checkIn } from "@/lib/attendance";
import { writeAuditLogSafe } from "@/lib/audit-log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role === "admin") return NextResponse.json({ ok: false, error: "บัญชีผู้ดูแลไม่ต้องลงเวลาเข้า/ออก" }, { status: 403 });

  try {
    const body = await req.json();
    const record = await checkIn(user, body);
    writeAuditLogSafe({
      user,
      action: "CHECK_IN",
      targetType: "attendance",
      targetId: record.id,
      details: { work_mode: record.work_mode, is_late: record.is_late },
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
