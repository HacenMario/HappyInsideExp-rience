import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const c = await collections();
  const list = await c.contactMessages.find().sort({ createdAt: -1 }).limit(200).toArray();
  return NextResponse.json({
    messages: list.map((m) => ({ ...m, _id: m._id!.toString() })),
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const c = await collections();
  await c.contactMessages.updateOne({ _id: new ObjectId(id) }, { $set: { read: true } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const c = await collections();
  await c.contactMessages.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
