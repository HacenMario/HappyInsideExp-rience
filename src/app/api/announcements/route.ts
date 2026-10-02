import { NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { ensureSeed } from "@/lib/seed";
import { edgeCacheHeaders, memoJson } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await memoJson("announcements", 30_000, async () => {
      await ensureSeed();
      const c = await collections();
      const list = await c.announcements
        .find({ active: true })
        .sort({ pinned: -1, createdAt: -1 })
        .toArray();
      return {
        announcements: list.map((a) => ({ ...a, _id: a._id!.toString() })),
      };
    });
    return NextResponse.json(payload, { headers: edgeCacheHeaders(30, 120) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
