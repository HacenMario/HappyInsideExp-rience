import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/* ============================================================
 * PREP HUB (Task 20) — participant preparation checklist
 * GET  → my checklist progress ({ checked: string[] })
 * PUT  → set the whole checked list (body: { checked: string[] })
 * Auth: any active registered user (pending or confirmed).
 * The checklist items themselves live in the i18n dictionary so
 * they are fully translated; only the item IDs are stored here.
 * ============================================================ */

async function requireRegisteredUser() {
  const user = await getCurrentUser();
  if (!user || user.role === "admin" || user.status !== "active") return null;
  const c = await collections();
  const reg = await c.registrations.findOne({
    userId: user._id!.toString(),
    status: { $in: ["pending", "confirmed"] },
  });
  if (!reg) return null;
  return { user, c, reg };
}

export async function GET() {
  try {
    const ctx = await requireRegisteredUser();
    if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const doc = await ctx.c.prepProgress.findOne({ userId: ctx.user._id!.toString() });
    return NextResponse.json({ checked: Array.isArray(doc?.checked) ? doc!.checked : [] });
  } catch (e) {
    console.error("[prep GET]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await requireRegisteredUser();
    if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const raw = Array.isArray(body?.checked) ? body.checked : [];
    // keep it sane: strings only, unique, capped
    const checked: string[] = [
      ...new Set<string>(raw.filter((x: unknown) => typeof x === "string").map((x) => String(x))),
    ].slice(0, 60);
    await ctx.c.prepProgress.updateOne(
      { userId: ctx.user._id!.toString() },
      { $set: { checked, updatedAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ ok: true, checked });
  } catch (e) {
    console.error("[prep PUT]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
