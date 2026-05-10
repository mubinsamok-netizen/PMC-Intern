import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { deleteAttendance, updateAttendance } from "@/lib/attendance";
import { writeAuditLogSafe } from "@/lib/audit-log";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = readSessionFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const record = await updateAttendance(user, id, body);
    writeAuditLogSafe({
      user,
      action: "UPDATE_ATTENDANCE",
      targetType: "attendance",
      targetId: id,
      details: { full_name: record.full_name, date: record.check_in_date, reason: body.correction_reason },
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = readSessionFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const result = await deleteAttendance(user, id);
    writeAuditLogSafe({
      user,
      action: "DELETE_ATTENDANCE",
      targetType: "attendance",
      targetId: id,
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
