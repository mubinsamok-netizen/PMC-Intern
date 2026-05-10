import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { deleteUser, updateUser } from "@/lib/users";
import { writeAuditLogSafe } from "@/lib/audit-log";

export const runtime = "nodejs";

function requireAdmin(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const user = await updateUser(id, body);
    writeAuditLogSafe({
      user: admin,
      action: body.password ? "RESET_PASSWORD" : "UPDATE_USER",
      targetType: "user",
      targetId: id,
      details: { email: user.email, full_name: user.full_name, fields: Object.keys(body).filter((key) => key !== "password") },
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const { id } = await ctx.params;
    if (id === admin.id) {
      return NextResponse.json({ ok: false, error: "ไม่สามารถลบบัญชีของตัวเองได้" }, { status: 400 });
    }
    const user = await deleteUser(id);
    writeAuditLogSafe({
      user: admin,
      action: "DELETE_USER",
      targetType: "user",
      targetId: id,
      details: { email: user.email, full_name: user.full_name },
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
