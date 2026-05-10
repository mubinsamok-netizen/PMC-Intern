import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { getTodayAttendance } from "@/lib/attendance";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const today = await getTodayAttendance(user);
  return NextResponse.json({ ok: true, today });
}
