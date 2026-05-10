import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { listAttendance } from "@/lib/attendance";
import { paginateRows } from "@/lib/pagination";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const rows = await listAttendance(user, {
    q: url.searchParams.get("q") || "",
    from: url.searchParams.get("from") || "",
    to: url.searchParams.get("to") || "",
    work_mode: url.searchParams.get("work_mode") || "",
    department: url.searchParams.get("department") || "",
  });
  const paged = paginateRows(rows, {
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
  });

  return NextResponse.json({ ok: true, ...paged });
}
