import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { title, titleFr, type, data } = await req.json();
    if (!data || !type) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

    // data must be a data URL: data:image/png;base64,.... or data:video/mp4;base64,...
    const match = String(data).match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!match) return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    const mimeType = match[1];
    const base64 = match[2];

    if (type === "image" && !mimeType.startsWith("image/")) {
      return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    }
    if (type === "video" && !mimeType.startsWith("video/")) {
      return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    }

    const size = Math.ceil((base64.length * 3) / 4);
    if (size > MAX_SIZE) {
      return NextResponse.json({ error: "too_large" }, { status: 413 });
    }

    const c = await collections();
    await c.media.insertOne({
      title: title || "بدون عنوان",
      titleFr: titleFr || title || "",
      type,
      data: String(data),
      mimeType,
      size,
      uploadedAt: new Date(),
    });
    return NextResponse.json({ ok: true, size });
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
  const all = searchParams.get("all");

  // DELETE /api/admin/media?all=true — wipe the whole gallery
  if (all === "true") {
    const c = await collections();
    const r = await c.media.deleteMany({});
    return NextResponse.json({ ok: true, deleted: r.deletedCount });
  }

  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const c = await collections();
  await c.media.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
