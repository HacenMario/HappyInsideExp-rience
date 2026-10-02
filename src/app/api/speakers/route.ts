import { NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { ensureSeed } from "@/lib/seed";
import { edgeCacheHeaders, memoJson } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await memoJson("speakers", 30_000, async () => {
      await ensureSeed();
      const c = await collections();
      const list = await c.speakers.find({ active: true }).sort({ order: 1 }).toArray();
      return {
        speakers: list.map((s) => ({ ...s, _id: s._id!.toString() })),
      };
    });
    return NextResponse.json(payload, { headers: edgeCacheHeaders(30, 120) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
