import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/* Task 21 — admin CRUD for participant testimonials.
 * The admin documents each participant's opinion (after the camp) and
 * controls when it goes live on the public page. */

const clip = (v: unknown, n: number): string => String(v ?? "").slice(0, n);

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const c = await collections();
    const list = await c.testimonials.find().sort({ createdAt: -1 }).limit(200).toArray();
    return NextResponse.json({
      testimonials: list.map((d) => ({
        id: d._id!.toString(),
        name: d.name,
        accountType: d.accountType,
        wilaya: d.wilaya,
        rating: d.rating,
        textAr: d.textAr,
        textFr: d.textFr,
        avatar: d.avatar || null,
        active: d.active,
        createdAt: d.createdAt,
      })),
    });
  } catch (e) {
    console.error("[admin/testimonials GET]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const name = clip(body.name, 60).trim();
    const textAr = clip(body.textAr, 600).trim();
    if (!name || !textAr) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const c = await collections();
    const accountType: "student" | "specialist" = body.accountType === "student" ? "student" : "specialist";
    const doc = {
      name,
      accountType,
      wilaya: clip(body.wilaya, 40).trim(),
      rating: Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5))),
      textAr,
      textFr: clip(body.textFr, 600).trim(),
      avatar:
        typeof body.avatar === "string" &&
        /^data:image\/(png|jpe?g|webp);base64,/.test(body.avatar) &&
        body.avatar.length <= 700_000
          ? body.avatar
          : null,
      active: body.active === false ? false : true,
      createdAt: new Date(),
    };
    const res = await c.testimonials.insertOne(doc);
    return NextResponse.json({ ok: true, id: res.insertedId.toString() });
  } catch (e) {
    console.error("[admin/testimonials POST]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "");
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
    const c = await collections();
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = clip(body.name, 60).trim();
    if (body.accountType !== undefined) update.accountType = body.accountType === "student" ? "student" : "specialist";
    if (body.wilaya !== undefined) update.wilaya = clip(body.wilaya, 40).trim();
    if (body.rating !== undefined) update.rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5)));
    if (body.textAr !== undefined) update.textAr = clip(body.textAr, 600).trim();
    if (body.textFr !== undefined) update.textFr = clip(body.textFr, 600).trim();
    if (body.active !== undefined) update.active = !!body.active;
    if (body.avatar === null) update.avatar = null;
    await c.testimonials.updateOne({ _id: new ObjectId(id) }, { $set: update });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/testimonials PATCH]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "");
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
    const c = await collections();
    await c.testimonials.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/testimonials DELETE]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
