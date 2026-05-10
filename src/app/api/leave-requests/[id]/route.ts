import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { reviewLeaveRequest } from "@/lib/leave-requests";
import { writeAuditLogSafe } from "@/lib/audit-log";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = readSessionFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const request = await reviewLeaveRequest(user, id, body);
    writeAuditLogSafe({
      user,
      action: request.status === "approved" ? "LEAVE_APPROVE" : "LEAVE_REJECT",
      targetType: "leave",
      targetId: id,
      details: { full_name: request.full_name, admin_note: body.admin_note },
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, request });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
