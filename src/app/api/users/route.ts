import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { createUser, listUsers } from "@/lib/users";
import { writeAuditLogSafe } from "@/lib/audit-log";
import { paginateRows } from "@/lib/pagination";

export const runtime = "nodejs";

function requireAdmin(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  const url = new URL(req.url);
  const users = await listUsers({
    q: url.searchParams.get("q") || "",
    role: url.searchParams.get("role") || "",
    status: url.searchParams.get("status") || "",
    department: url.searchParams.get("department") || "",
  });
  const paged = paginateRows(users, {
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
  });
  return NextResponse.json({ ok: true, users: paged.rows, pagination: paged.pagination });
}

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const user = await createUser(body);
    writeAuditLogSafe({
      user: admin,
      action: "CREATE_USER",
      targetType: "user",
      targetId: String(user.id || ""),
      details: { email: user.email, full_name: user.full_name, role: user.role },
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
