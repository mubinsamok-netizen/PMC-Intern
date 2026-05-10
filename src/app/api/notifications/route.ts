import { NextRequest, NextResponse } from "next/server";
import { readSessionFromRequest } from "@/lib/auth/session";
import { listNotifications, markAllNotificationsRead } from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const result = await listNotifications(user, {
    limit: url.searchParams.get("limit") || "",
    unread: url.searchParams.get("unread") || "",
  });

  return NextResponse.json({ ok: true, ...result });
}

export async function PATCH(req: NextRequest) {
  const user = readSessionFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    if (body.all === true) {
      const result = await markAllNotificationsRead(user);
      return NextResponse.json(result);
    }
    return NextResponse.json({ ok: false, error: "Invalid notification action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
