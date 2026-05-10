import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: env.appName,
    version: env.appVersion,
    time: new Date().toISOString(),
    timezone: env.timezone,
  });
}

