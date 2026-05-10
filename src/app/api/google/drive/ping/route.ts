import { NextResponse } from "next/server";
import { getDriveRootInfo } from "@/lib/google/drive";

export const runtime = "nodejs";

export async function GET() {
  try {
    const folder = await getDriveRootInfo();
    return NextResponse.json({ ok: true, folder });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

