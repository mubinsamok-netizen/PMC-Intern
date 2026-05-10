import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest, SESSION_COOKIE } from "@/lib/auth/session";
import { writeAuditLogSafe } from "@/lib/audit-log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (user) {
    writeAuditLogSafe({
      user,
      action: "LOGOUT",
      targetType: "auth",
      targetId: user.id,
      userAgent: req.headers.get("user-agent") || "",
    });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return res;
}
