import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { findUserByEmail, sanitizeUser } from "@/lib/users";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const current = await findUserByEmail(user.email);
  return NextResponse.json({ ok: true, user: current ? sanitizeUser(current) : user });
}
