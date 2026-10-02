import { NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { ensureSeed } from "@/lib/seed";
import { edgeCacheHeaders, memoJson } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await memoJson("media", 60_000, async () => {
      await ensureSeed();
      const c = await collections();
      const list = await c.media.find().sort({ uploadedAt: -1 }).limit(60).toArray();
      return {
        media: list.map((m) => ({
          id: m._id!.toString(),
          title: m.title,
          titleFr: m.titleFr || "",
          type: m.type,
          data: m.data,
          mimeType: m.mimeType,
          uploadedAt: m.uploadedAt,
        })),
      };
    });
    // media payloads carry base64 images (heavy) — the longest cache window
    return NextResponse.json(payload, { headers: edgeCacheHeaders(60, 300) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
