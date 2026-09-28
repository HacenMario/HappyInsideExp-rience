import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    app: "Happy inside expérience",
    status: "ok",
    health: "/api/health",
    time: new Date().toISOString(),
  });
}
