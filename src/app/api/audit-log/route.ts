import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { listAuditLogs } from "@/lib/audit-log";
import { paginateRows } from "@/lib/pagination";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const rows = await listAuditLogs({
    q: url.searchParams.get("q") || "",
    action: url.searchParams.get("action") || "",
    from: url.searchParams.get("from") || "",
    to: url.searchParams.get("to") || "",
    limit: url.searchParams.get("limit") || "",
  });
  const paged = paginateRows(rows, {
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
  });

  return NextResponse.json({ ok: true, ...paged });
}
