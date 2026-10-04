import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { edgeCacheHeaders, memoJson } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

/* ============================================================
 * SHARED MEMORIES ALBUM (Task 20)
 *
 * GET              → approved memories (public, edge-cached 30s)
 * GET ?mine=1      → my own submissions incl. status (auth)
 * POST { dataUrl, caption }
 *                  → submit a photo (auth + active registration).
 *                    The browser compresses the image first via
 *                    lib/image-client (same pipeline as admin media).
 *                    Stored as "pending" until an admin approves it.
 *
 * Privacy: the author is stored as a masked display name
 * ("سارة ب.") — never full name or phone.
 * ============================================================ */

const MAX_BYTES = 1_400_000; // matches the compression target (+ headroom)

export const maskAuthor = (full: string): string => {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0] || "";
  if (parts.length === 1) return first;
  const initial = (parts[1] || "").charAt(0);
  return initial ? `${first} ${initial}.` : first;
};

export async function GET(req: NextRequest) {
  try {
    const mine = req.nextUrl.searchParams.get("mine") === "1";
    if (mine) {
      const me = await getCurrentUser();
      if (!me || me.status !== "active") {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const c = await collections();
      const list = await c.memories
        .find({ userId: me._id!.toString() })
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray();
      return NextResponse.json({
        mine: list.map((m) => ({
          id: m._id!.toString(),
          caption: m.caption || "",
          data: m.data,
          mimeType: m.mimeType,
          status: m.status,
          createdAt: m.createdAt,
        })),
      });
    }

    const payload = await memoJson("memories-approved", 30_000, async () => {
      const c = await collections();
      const list = await c.memories
        .find({ status: "approved" })
        .sort({ createdAt: -1 })
        .limit(60)
        .toArray();
      return {
        memories: list.map((m) => ({
          id: m._id!.toString(),
          author: m.authorName,
          caption: m.caption || "",
          data: m.data,
          mimeType: m.mimeType,
          createdAt: m.createdAt,
        })),
      };
    });
    return NextResponse.json(payload, { headers: edgeCacheHeaders(30, 120) });
  } catch (e) {
    console.error("[memories GET]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me || me.role === "admin" || me.status !== "active") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const c = await collections();
    const reg = await c.registrations.findOne({
      userId: me._id!.toString(),
      status: { $in: ["pending", "confirmed"] },
    });
    if (!reg) return NextResponse.json({ error: "not_registered" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const dataUrl = String(body?.dataUrl || "");
    const caption = String(body?.caption || "").trim().slice(0, 200);
    const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,/.exec(dataUrl);
    if (!m) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    const size = Math.round((dataUrl.length - m[0].length) * 0.75);
    if (size <= 0 || size > MAX_BYTES) {
      return NextResponse.json({ error: "too_large" }, { status: 413 });
    }

    // gentle rate-limit: max 30 submissions per user
    const count = await c.memories.countDocuments({ userId: me._id!.toString() });
    if (count >= 30) return NextResponse.json({ error: "limit_reached" }, { status: 429 });

    const doc = await c.memories.insertOne({
      userId: me._id!.toString(),
      authorName: maskAuthor(String(me.fullName || "")),
      caption,
      data: dataUrl,
      mimeType: m[1],
      size,
      status: "pending",
      createdAt: new Date(),
    });
    return NextResponse.json({ ok: true, id: doc.insertedId.toString(), status: "pending" });
  } catch (e) {
    console.error("[memories POST]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me || me.status !== "active") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const id = String(body?.id || "");
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }
    const c = await collections();
    // authors may delete their own pending submissions; admins may delete any
    const filter: Record<string, unknown> = { _id: new ObjectId(id) };
    if (me.role !== "admin") filter.userId = me._id!.toString();
    const res = await c.memories.deleteOne(filter);
    if (!res.deletedCount) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[memories DELETE]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
