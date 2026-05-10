import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, readSessionFromRequest, signSession, type SessionUser } from "@/lib/auth/session";
import { deleteDriveFile, extractDriveFileId, uploadBase64Image } from "@/lib/google/drive";
import { findUserByEmail, sanitizeUser, updateUser } from "@/lib/users";
import { env } from "@/lib/env";
import { writeAuditLogSafe } from "@/lib/audit-log";

export const runtime = "nodejs";

function text(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function sessionFromUser(user: Record<string, string>): SessionUser {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role === "admin" ? "admin" : "intern",
    department: user.department,
    intern_code: user.intern_code,
    employee_code: user.employee_code,
    profile_image: user.profile_image,
  };
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = readSessionFromRequest(req);
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const current = await findUserByEmail(sessionUser.email);
    if (!current || current.status === "deleted" || current.status === "inactive") {
      return NextResponse.json({ ok: false, error: "ไม่พบบัญชี หรือบัญชีถูกปิดใช้งาน" }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, string> = {};
    let oldProfileFileId = "";
    const allowed = ["full_name", "phone", "profile_image"];
    allowed.forEach((key) => {
      if (body[key] !== undefined) updates[key] = text(body[key]);
    });

    if (body.profileImageBase64) {
      oldProfileFileId = extractDriveFileId(current.profile_image);
      const upload = await uploadBase64Image(
        text(body.profileImageBase64, 8_000_000),
        "profiles",
        `profile_${sessionUser.id}_${Date.now()}`,
      );
      updates.profile_image = upload.url;
    }

    if (!updates.full_name && !updates.phone && !updates.profile_image) {
      return NextResponse.json({ ok: false, error: "ไม่มีข้อมูลสำหรับบันทึก" }, { status: 400 });
    }

    const saved = await updateUser(current.id, updates);
    const newProfileFileId = extractDriveFileId(String(updates.profile_image || ""));
    if (oldProfileFileId && oldProfileFileId !== newProfileFileId) {
      deleteDriveFile(oldProfileFileId).catch((error) => console.error(error));
    }
    const nextSession = sessionFromUser(saved as Record<string, string>);
    const token = signSession(nextSession);

    writeAuditLogSafe({
      user: sessionUser,
      action: "UPDATE_PROFILE",
      targetType: "user",
      targetId: current.id,
      details: { fields: Object.keys(updates) },
      userAgent: req.headers.get("user-agent") || "",
    });

    const res = NextResponse.json({ ok: true, token, user: sanitizeUser(saved) });
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
