import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Google Sheet report export is disabled to save Google Sheets API quota. Use CSV export instead." },
    { status: 410 },
  );
}
