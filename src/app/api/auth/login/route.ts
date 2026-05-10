import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, signSession, type SessionUser } from "@/lib/auth/session";
import { findUserByEmail, sanitizeUser, updateUser } from "@/lib/users";
import { env } from "@/lib/env";
import { writeAuditLogSafe } from "@/lib/audit-log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = await findUserByEmail(email);

    if (!user || user.status === "inactive") {
      writeAuditLogSafe({
        action: "LOGIN_FAILED",
        targetType: "auth",
        targetId: email,
        details: "account not found or inactive",
        userAgent: req.headers.get("user-agent") || "",
      });
      return NextResponse.json({ ok: false, error: "ไม่พบบัญชี หรือบัญชีถูกปิดใช้งาน" }, { status: 401 });
    }

    if (!user.password) {
      return NextResponse.json({
        ok: false,
        error: "ชีต Users ยังไม่มีคอลัมน์ password หรือยังไม่ได้เติมรหัสผ่านแบบข้อความปกติ",
        hint: "ให้เรียก POST /api/setup/plain-passwords ก่อน",
      }, { status: 409 });
    }

    if (String(user.password) !== password) {
      writeAuditLogSafe({
        user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role === "admin" ? "admin" : "intern" },
        action: "LOGIN_FAILED",
        targetType: "auth",
        targetId: user.id,
        details: "invalid password",
        userAgent: req.headers.get("user-agent") || "",
      });
      return NextResponse.json({ ok: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role === "admin" ? "admin" : "intern",
      department: user.department,
      intern_code: user.intern_code,
      employee_code: user.employee_code,
      profile_image: user.profile_image,
    };
    const token = signSession(sessionUser);

    await updateUser(user.id, { last_login_at: new Date().toISOString() });
    writeAuditLogSafe({
      user: sessionUser,
      action: "LOGIN",
      targetType: "auth",
      targetId: user.id,
      userAgent: req.headers.get("user-agent") || "",
    });

    const res = NextResponse.json({ ok: true, token, user: sanitizeUser(user) });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: env.sessionTtlHours * 60 * 60,
      path: "/",
    });
    return res;
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
