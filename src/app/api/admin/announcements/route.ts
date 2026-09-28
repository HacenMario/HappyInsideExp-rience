import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { sendPushToAll } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const c = await collections();
  const list = await c.announcements.find().sort({ pinned: -1, createdAt: -1 }).toArray();
  return NextResponse.json({
    announcements: list.map((a) => ({ ...a, _id: a._id!.toString() })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { titleAr, titleFr, bodyAr, bodyFr, pinned, active, notify } = await req.json();
    if (!titleAr || !titleFr || !bodyAr || !bodyFr) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const c = await collections();
    await c.announcements.insertOne({
      titleAr,
      titleFr,
      bodyAr,
      bodyFr,
      pinned: !!pinned,
      active: active !== false,
      notify: !!notify,
      createdAt: new Date(),
    });
    if (notify) {
      await sendPushToAll({
        titleAr,
        titleFr,
        bodyAr: String(bodyAr).slice(0, 180),
        bodyFr: String(bodyFr).slice(0, 180),
        link: "/announcements",
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { id, ...rest } = await req.json();
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const update: Record<string, unknown> = {};
    const fields = ["titleAr", "titleFr", "bodyAr", "bodyFr", "pinned", "active"];
    for (const f of fields) {
      if (rest[f] !== undefined) update[f] = rest[f];
    }
    const c = await collections();
    await c.announcements.updateOne({ _id: new ObjectId(id) }, { $set: update });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const c = await collections();
  await c.announcements.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
