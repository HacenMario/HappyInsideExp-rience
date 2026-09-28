import { NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const c = await collections();
    const list = await c.announcements
      .find({ active: true })
      .sort({ pinned: -1, createdAt: -1 })
      .toArray();
    return NextResponse.json({
      announcements: list.map((a) => ({ ...a, _id: a._id!.toString() })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
