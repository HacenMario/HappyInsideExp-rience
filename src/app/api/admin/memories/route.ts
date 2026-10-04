import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/* ============================================================
 * ADMIN — MEMORIES MODERATION (Task 20)
 * GET                → all memories, newest first (limit 120)
 * POST { id, action }→ action: "approve" | "reject" | "delete"
 * Admin only. Never exposes uploader phone (author is masked).
 * ============================================================ */

export async function GET() {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const c = await collections();
    const list = await c.memories.find().sort({ createdAt: -1 }).limit(120).toArray();
    const pending = list.filter((m) => m.status === "pending").length;
    return NextResponse.json({
      pending,
      memories: list.map((m) => ({
        id: m._id!.toString(),
        author: m.authorName,
        caption: m.caption || "",
        data: m.data,
        mimeType: m.mimeType,
        size: m.size,
        status: m.status,
        createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    console.error("[admin/memories GET]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const id = String(body?.id || "");
    const action = String(body?.action || "");
    if (!/^[0-9a-fA-F]{24}$/.test(id) || !["approve", "reject", "delete"].includes(action)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const c = await collections();
    if (action === "delete") {
      const res = await c.memories.deleteOne({ _id: new ObjectId(id) });
      if (!res.deletedCount) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
    const status = action === "approve" ? "approved" : "rejected";
    const res = await c.memories.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, reviewedAt: new Date() } }
    );
    if (!res.matchedCount) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, status });
  } catch (e) {
    console.error("[admin/memories POST]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
