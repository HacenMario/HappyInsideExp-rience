import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint — used by Railway (healthcheckPath), uptime monitors
 * and quick manual diagnostics. Returns 200 when the app + database are fine,
 * 503 when MongoDB is unreachable.
 */
export async function GET() {
  const startedAt = Date.now();
  let db: "connected" | "unreachable" = "unreachable";
  let dbError = "";

  try {
    const { getDb } = await import("@/lib/mongodb");
    const database = await getDb();
    await database.command({ ping: 1 });
    db = "connected";
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  const latencyMs = Date.now() - startedAt;
  return NextResponse.json(
    {
      status: db === "connected" ? "ok" : "degraded",
      app: "Happy inside expérience",
      db,
      latencyMs,
      time: new Date().toISOString(),
      ...(dbError ? { dbError } : {}),
    },
    { status: db === "connected" ? 200 : 503 }
  );
}
