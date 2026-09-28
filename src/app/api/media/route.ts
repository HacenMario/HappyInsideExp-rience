import { NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const c = await collections();
    const list = await c.media.find().sort({ uploadedAt: -1 }).limit(60).toArray();
    return NextResponse.json({
      media: list.map((m) => ({
        id: m._id!.toString(),
        title: m.title,
        titleFr: m.titleFr || "",
        type: m.type,
        data: m.data,
        mimeType: m.mimeType,
        uploadedAt: m.uploadedAt,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
