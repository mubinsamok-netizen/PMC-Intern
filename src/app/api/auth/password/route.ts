import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { findUserByEmail, updateUser } from "@/lib/users";
import { writeAuditLogSafe } from "@/lib/audit-log";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = readSessionFromRequest(req);
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "").trim();
    const confirmPassword = String(body.confirmPassword || "").trim();

    if (newPassword.length < 6) {
      return NextResponse.json({ ok: false, error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ ok: false, error: "ยืนยันรหัสผ่านใหม่ไม่ตรงกัน" }, { status: 400 });
    }

    const user = await findUserByEmail(sessionUser.email);
    if (!user || user.status === "deleted" || user.status === "inactive") {
      return NextResponse.json({ ok: false, error: "ไม่พบบัญชี หรือบัญชีถูกปิดใช้งาน" }, { status: 404 });
    }
    if (String(user.password || "") !== currentPassword) {
      return NextResponse.json({ ok: false, error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });
    }

    await updateUser(user.id, { password: newPassword });
    writeAuditLogSafe({
      user: sessionUser,
      action: "CHANGE_PASSWORD",
      targetType: "user",
      targetId: user.id,
      userAgent: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true, message: "เปลี่ยนรหัสผ่านเรียบร้อย" });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
