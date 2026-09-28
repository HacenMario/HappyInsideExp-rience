import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const c = await collections();
  const list = await c.faqs.find().sort({ order: 1 }).toArray();
  return NextResponse.json({ faqs: list.map((f) => ({ ...f, _id: f._id!.toString() })) });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { questionAr, questionFr, answerAr, answerFr, order } = await req.json();
    if (!questionAr || !questionFr || !answerAr || !answerFr) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const c = await collections();
    await c.faqs.insertOne({
      questionAr,
      questionFr,
      answerAr,
      answerFr,
      order: parseInt(String(order)) || 99,
      active: true,
    });
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
    const fields = ["questionAr", "questionFr", "answerAr", "answerFr", "order", "active"];
    for (const f of fields) {
      if (rest[f] !== undefined) update[f] = rest[f];
    }
    const c = await collections();
    await c.faqs.updateOne({ _id: new ObjectId(id) }, { $set: update });
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
  await c.faqs.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
