import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { createLeaveRequest, listLeaveRequests } from "@/lib/leave-requests";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { paginateRows } from "@/lib/pagination";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const rows = await listLeaveRequests(user, {
    q: url.searchParams.get("q") || "",
    status: url.searchParams.get("status") || "",
    from: url.searchParams.get("from") || "",
    to: url.searchParams.get("to") || "",
  });
  const paged = paginateRows(rows, {
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
  });

  return NextResponse.json({ ok: true, ...paged });
}

export async function POST(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const request = await createLeaveRequest(user, body);
    writeAuditLogSafe({
      user,
      action: "LEAVE_REQUEST",
      targetType: "leave",
      targetId: request.id,
      details: { leave_type: request.leave_type, start_date: request.start_date, end_date: request.end_date },
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, request }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
