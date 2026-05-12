import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { createSiteVisit, listSiteVisits } from "@/lib/site-visits";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const rows = await listSiteVisits(user, {
    attendance_id: url.searchParams.get("attendance_id") || "",
    date: url.searchParams.get("date") || "",
    user_id: url.searchParams.get("user_id") || "",
  });

  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const visit = await createSiteVisit(user, body);
    return NextResponse.json({ ok: true, visit }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
