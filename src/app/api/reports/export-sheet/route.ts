import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { createAttendanceReportSheet } from "@/lib/reports";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const report = await createAttendanceReportSheet(user, {
      q: String(body.q || ""),
      from: String(body.from || ""),
      to: String(body.to || ""),
      groupBy: String(body.groupBy || "user"),
    });
    writeAuditLogSafe({
      user,
      action: "EXPORT_REPORT_SHEET",
      targetType: "report",
      targetId: report.spreadsheetId,
      details: { groupBy: report.groupBy, rows: report.rows, groups: report.groups },
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
