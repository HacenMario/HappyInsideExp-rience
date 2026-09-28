import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { sendPushToAll, getVapidPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = await getVapidPublicKey();
  const c = await collections();
  const subs = await c.pushSubs.countDocuments();
  return NextResponse.json({ publicKey: key, subscribers: subs });
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { titleAr, titleFr, bodyAr, bodyFr, link, push } = await req.json();
    if (!titleAr || !titleFr || !bodyAr || !bodyFr) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const c = await collections();
    await c.notifications.insertOne({
      userId: null,
      titleAr,
      titleFr,
      bodyAr,
      bodyFr,
      link: link || undefined,
      readBy: [],
      createdAt: new Date(),
    });
    if (push) {
      await sendPushToAll({ titleAr, titleFr, bodyAr, bodyFr, link });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const c = await collections();
  await c.notifications.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
