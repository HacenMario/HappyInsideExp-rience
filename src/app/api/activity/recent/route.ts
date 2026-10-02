import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { WILAYAS } from "@/lib/wilayas";

export const dynamic = "force-dynamic";

/* ============================================================
 * LIVE ACTIVITY FEED (public, privacy-safe)
 * Returns the most recent camp registrations as elegant
 * social-proof popup data:
 *   - first name + initial only  ("سارة ب.") — never full name/phone
 *   - accountType + wilaya (for the popup wording)
 *   - seat number (chronological rank among active registrations)
 *   - createdAt ISO (client renders "قبل 3 دقائق" / "il y a 3 min")
 * No auth required (public landing social proof), NO sensitive data.
 * ============================================================ */

export async function GET() {
  try {
    const c = await collections();

    const regs = await c.registrations
      .find({ status: { $in: ["pending", "confirmed"] } })
      .sort({ createdAt: 1 })
      .limit(200)
      .toArray();

    if (regs.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // batch-resolve wilayas from the users collection
    const userIds = [...new Set(regs.map((r) => String(r.userId)))]
      .filter((id) => /^[0-9a-fA-F]{24}$/.test(id))
      .map((id) => new ObjectId(id));
    const wilayaByUser = new Map<string, string>();
    if (userIds.length) {
      const users = await c.users
        .find({ _id: { $in: userIds } })
        .project<{ _id: ObjectId; wilaya?: string }>({ wilaya: 1 })
        .toArray();
      for (const u of users) wilayaByUser.set(String(u._id), String(u.wilaya ?? ""));
    }

    const maskName = (full: string): string => {
      const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return "";
      const first = parts[0] || "";
      if (parts.length === 1) return first;
      const initial = (parts[1] || "").charAt(0);
      return initial ? `${first} ${initial}.` : first;
    };

    const total = regs.length;
    let items = regs.slice(-10).map((r, i) => {
      const wilayaAr = wilayaByUser.get(String(r.userId)) || "";
      const wilayaFr = WILAYAS.find((w) => w.ar === wilayaAr)?.fr || "";
      return {
        id: String(r._id ?? ""),
        name: maskName(String(r.userFullName ?? "")),
        accountType: r.accountType === "student" ? "student" : "specialist",
        wilaya: wilayaAr,
        wilayaFr,
        seat: Math.max(1, total - Math.min(10, total) + i + 1),
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      };
    });

    items.reverse(); // newest first
    return NextResponse.json({ items });
  } catch (e) {
    console.error("activity feed error", e);
    return NextResponse.json({ items: [] });
  }
}
