import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { migratePlainPasswords } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const headerSecret = req.headers.get("x-cron-secret") || "";
  if (!env.cronSecret || headerSecret !== env.cronSecret) {
    return NextResponse.json({ ok: false, error: "Invalid setup secret" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await migratePlainPasswords({
    adminPassword: String(body.adminPassword || "Admin@2026"),
    internPassword: String(body.internPassword || "Demo@2026"),
  });

  return NextResponse.json({
    ok: true,
    message: "Users sheet now has a plain password column",
    ...result,
  });
}

