import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { createHoliday, deleteHoliday, updateHoliday } from "@/lib/workdays";
import { writeAuditLogSafe } from "@/lib/audit-log";

export const runtime = "nodejs";

function requireAdmin(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const holiday = await createHoliday(body);
    writeAuditLogSafe({
      user: admin,
      action: "CREATE_HOLIDAY",
      targetType: "holiday",
      targetId: holiday.id,
      details: holiday,
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, holiday }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) throw new Error("Missing holiday id");
    const holiday = await updateHoliday(id, body);
    writeAuditLogSafe({
      user: admin,
      action: "UPDATE_HOLIDAY",
      targetType: "holiday",
      targetId: holiday.id,
      details: holiday,
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, holiday });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id") || "";
    if (!id) throw new Error("Missing holiday id");
    const holiday = await deleteHoliday(id);
    writeAuditLogSafe({
      user: admin,
      action: "DELETE_HOLIDAY",
      targetType: "holiday",
      targetId: holiday.id,
      details: holiday,
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, holiday });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
