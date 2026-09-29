import { NextRequest, NextResponse } from "next/server";
import { collections, ObjectIdToString } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/* Look back at most 30 days so a long-sleeping device is never flooded. */
const MAX_LOOKBACK_MS = 1000 * 60 * 60 * 24 * 30;

const normalizePhone = (v: unknown) => {
  const s = String(v || "").replace(/\s/g, "");
  return s.startsWith("guest:") ? s : s.replace(/-/g, "");
};

interface PollBody {
  phone?: string;
  deviceToken?: string;
  since?: string; // ISO date of the last event the device already saw
}

/* Background-notification feed for the Android app (WorkManager polling).
 * Auth = phone + deviceToken issued by /api/mobile/register.
 * Returns the user's new notifications + new active announcements since
 * the given timestamp. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as PollBody;
    const phone = normalizePhone(body?.phone);
    const token = String(body?.deviceToken || "");
    if (!phone || !token) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const c = await collections();
    const device = await c.mobileDevices.findOne({ phone });
    if (!device || device.deviceToken !== token) {
      return NextResponse.json({ error: "invalid_device" }, { status: 401 });
    }

    const now = new Date();
    const sinceMs = Date.parse(String(body?.since || ""));
    const since = new Date(
      Number.isFinite(sinceMs) ? Math.max(now.getTime() - MAX_LOOKBACK_MS, sinceMs) : 0
    );

    const uid = device.userId && device.userId !== "null" ? device.userId : null;
    const audience = uid ? [{ userId: null }, { userId: uid }] : [{ userId: null }];

    const [notifications, announcements] = await Promise.all([
      c.notifications
        .find({ createdAt: { $gt: since }, $or: audience })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      c.announcements
        .find({ active: true, createdAt: { $gt: since } })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
    ]);

    void c.mobileDevices
      .updateOne({ phone }, { $set: { lastActiveAt: now } })
      .catch(() => {});

    return NextResponse.json({
      ok: true,
      serverTime: now.toISOString(),
      notifications: notifications.map((n) => ({
        id: n._id ? ObjectIdToString(n._id) : "",
        kind: "notification" as const,
        titleAr: n.titleAr,
        titleFr: n.titleFr,
        bodyAr: n.bodyAr,
        bodyFr: n.bodyFr,
        link: n.link || "",
        createdAt: n.createdAt,
      })),
      announcements: announcements.map((a) => ({
        id: a._id ? ObjectIdToString(a._id) : "",
        kind: "announcement" as const,
        titleAr: a.titleAr,
        titleFr: a.titleFr,
        bodyAr: a.bodyAr,
        bodyFr: a.bodyFr,
        createdAt: a.createdAt,
      })),
    });
  } catch (e) {
    console.error("[mobile/poll]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
