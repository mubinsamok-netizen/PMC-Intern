import { NextResponse } from "next/server";
import { getSpreadsheetInfo } from "@/lib/google/sheets";

export const runtime = "nodejs";

export async function GET() {
  try {
    const info = await getSpreadsheetInfo();
    return NextResponse.json({ ok: true, ...info });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

