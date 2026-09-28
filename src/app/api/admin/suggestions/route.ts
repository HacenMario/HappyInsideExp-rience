import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const c = await collections();
  const list = await c.suggestions.find().sort({ createdAt: -1 }).limit(200).toArray();
  return NextResponse.json({
    suggestions: list.map((s) => ({ ...s, _id: s._id!.toString() })),
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, status } = await req.json();
  if (!id || !["new", "in_review", "resolved"].includes(status)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const c = await collections();
  await c.suggestions.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const c = await collections();
  await c.suggestions.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
