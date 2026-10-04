import { NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { edgeCacheHeaders, memoJson } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

/* Task 21 — public testimonials ("آراء المشاركين في المخيم").
 * Only ACTIVE testimonials written/documented by the admin are exposed.
 * Safe for edge caching: the body is identical for every visitor. */
export async function GET() {
  try {
    const payload = await memoJson("testimonials-public", 30_000, async () => {
      const c = await collections();
      const list = await c.testimonials
        .find({ active: true })
        .sort({ createdAt: -1 })
        .limit(60)
        .toArray();
      const testimonials = list.map((d) => ({
        id: d._id!.toString(),
        name: d.name,
        accountType: d.accountType,
        wilaya: d.wilaya,
        rating: d.rating,
        textAr: d.textAr,
        textFr: d.textFr,
        avatar: d.avatar || null,
        createdAt: d.createdAt,
      }));
      const avg =
        testimonials.length > 0
          ? Math.round((testimonials.reduce((s, x) => s + (x.rating || 0), 0) / testimonials.length) * 10) / 10
          : 0;
      return { testimonials, count: testimonials.length, avg };
    });
    return NextResponse.json(payload, { headers: edgeCacheHeaders(30, 120) });
  } catch (e) {
    console.error("[testimonials GET]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
