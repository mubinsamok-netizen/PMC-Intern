import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runLineAutomation } from "@/lib/line-automation";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest) {
  const bearer = req.headers.get("authorization") || "";
  const secret = bearer.startsWith("Bearer ")
    ? bearer.slice("Bearer ".length)
    : req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret") || "";
  return Boolean(env.cronSecret && secret === env.cronSecret);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const action = req.nextUrl.searchParams.get("action") || "summary";
    const date = req.nextUrl.searchParams.get("date") || undefined;
    const force = req.nextUrl.searchParams.get("force") === "true";
    const result = await runLineAutomation(action, date, { force });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const result = await runLineAutomation(
      String(body.action || "summary"),
      body.date ? String(body.date) : undefined,
      { force: body.force === true || body.force === "true" },
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
