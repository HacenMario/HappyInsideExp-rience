import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { edgeCacheHeaders, memoJson } from "@/lib/http-cache";
import { WILAYAS } from "@/lib/wilayas";

export const dynamic = "force-dynamic";

/* ============================================================
 * ALUMNI NETWORK (Task 20) — "Happy inside" community
 *
 * GET  → public directory of opted-in members (each member must
 *        currently hold a CONFIRMED registration). Search-friendly
 *        fields only: name, category, wilaya, workplace, bio, avatar.
 *        No phones, no emails — ever.
 * PUT { join: boolean } → join / leave the network (auth, active
 *        registration required to join).
 * ============================================================ */

export async function GET() {
  try {
    const payload = await memoJson("alumni-directory", 60_000, async () => {
      const c = await collections();
      const members = await c.alumni.find().sort({ optedInAt: 1 }).limit(120).toArray();
      const ids = members
        .map((m) => (String(m.userId).match(/^[0-9a-fA-F]{24}$/) ? new ObjectId(String(m.userId)) : null))
        .filter((x): x is ObjectId => x !== null);
      const users = ids.length ? await c.users.find({ _id: { $in: ids } }).toArray() : [];
      const userMap = new Map(users.map((u) => [u._id!.toString(), u]));

      // keep only active users who still hold a confirmed seat
      const regs = await c.registrations
        .find({ status: "confirmed" })
        .sort({ createdAt: 1 })
        .toArray();
      const confirmedUsers = new Set(regs.map((r) => String(r.userId)));

      const dir = members
        .map((m) => {
          const u = userMap.get(String(m.userId));
          if (!u || u.role !== "user" || u.status !== "active") return null;
          if (!confirmedUsers.has(String(m.userId))) return null;
          const wilayaAr = String(u.wilaya || "");
          return {
            userId: String(m.userId),
            fullName: String(u.fullName || ""),
            accountType: u.accountType === "student" ? "student" : "specialist",
            wilaya: wilayaAr,
            wilayaFr: WILAYAS.find((w) => w.ar === wilayaAr)?.fr || "",
            workplace: String(u.workplace || ""),
            bio: String(u.bio || ""),
            avatar: u.avatar || null,
            optedInAt: m.optedInAt,
          };
        })
        .filter(Boolean);

      return { members: dir };
    });
    return NextResponse.json(payload, { headers: edgeCacheHeaders(60, 180) });
  } catch (e) {
    console.error("[alumni GET]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me || me.role === "admin" || me.status !== "active") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const join = body?.join === true;
    const c = await collections();
    const uid = me._id!.toString();

    if (join) {
      const reg = await c.registrations.findOne({
        userId: uid,
        status: { $in: ["pending", "confirmed"] },
      });
      if (!reg) return NextResponse.json({ error: "not_registered" }, { status: 403 });
      await c.alumni.updateOne(
        { userId: uid },
        { $setOnInsert: { userId: uid, optedInAt: new Date() } },
        { upsert: true }
      );
    } else {
      await c.alumni.deleteOne({ userId: uid });
    }
    return NextResponse.json({ ok: true, member: join });
  } catch (e) {
    console.error("[alumni PUT]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/* GET my membership state */
export async function POST() {
  try {
    const me = await getCurrentUser();
    if (!me || me.status !== "active") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const c = await collections();
    const doc = await c.alumni.findOne({ userId: me._id!.toString() });
    return NextResponse.json({ member: !!doc });
  } catch (e) {
    console.error("[alumni POST]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
