import { NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const c = await collections();
    const list = await c.faqs.find({ active: true }).sort({ order: 1 }).toArray();
    return NextResponse.json({
      faqs: list.map((f) => ({ ...f, _id: f._id!.toString() })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
