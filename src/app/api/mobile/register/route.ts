import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { collections } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

interface RegisterBody {
  type?: "user" | "guest";
  phone?: string;
  userId?: string;
  fullName?: string;
  /* native app passes its previously stored identity so guests are not
   * duplicated on every page load and guests are cleaned up on login */
  currentPhone?: string;
  currentToken?: string;
  platform?: string;
  appVersion?: string;
  fcmToken?: string;
}

const PHONE_RE = /^(0)(5|6|7)[0-9]{8}$/;

/* Normalize a phone: strip whitespace; strip dashes ONLY for real user
 * phones — guest identities ("guest:<uuid>") keep their dashes. */
const normalizePhone = (v: unknown) => {
  const s = String(v || "").replace(/\s/g, "");
  return s.startsWith("guest:") ? s : s.replace(/-/g, "");
};
const newToken = () =>
  randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 16); // 48 hex chars
const isGuest = (p: string) => p.startsWith("guest:");

let indexed = false;
async function ensureIndex() {
  if (indexed) return;
  const c = await collections();
  await c.mobileDevices.createIndex({ phone: 1 }, { unique: true });
  indexed = true;
}

/* Registers a mobile device for background notifications (Android app).
 * Returns { phone, deviceToken } — the token authenticates /api/mobile/poll. */
export async function POST(req: NextRequest) {
  try {
    await ensureIndex();
    const body = (await req.json().catch(() => ({}))) as RegisterBody;
    const type = body.type === "user" ? "user" : "guest";
    const now = new Date();
    const currentPhone = normalizePhone(body.currentPhone);
    const currentToken = String(body.currentToken || "");
    const fcmToken = body.fcmToken ? String(body.fcmToken).slice(0, 255) : undefined;

    const c = await collections();

    if (type === "guest") {
      /* Returning guest device → refresh it instead of creating a new one */
      if (isGuest(currentPhone) && currentToken) {
        const existing = await c.mobileDevices.findOne({ phone: currentPhone });
        if (existing && existing.deviceToken === currentToken) {
          await c.mobileDevices.updateOne(
            { phone: currentPhone },
            { $set: { lastActiveAt: now, ...(fcmToken ? { fcmToken } : {}) } }
          );
          return NextResponse.json({ ok: true, phone: currentPhone, deviceToken: existing.deviceToken });
        }
      }
      const phone = `guest:${randomUUID()}`;
      const deviceToken = newToken();
      await c.mobileDevices.insertOne({
        phone,
        userId: null,
        deviceToken,
        platform: body.platform === "android" ? "android" : "unknown",
        appVersion: body.appVersion ? String(body.appVersion).slice(0, 20) : undefined,
        fcmToken: fcmToken ?? null,
        createdAt: now,
        lastActiveAt: now,
      });
      return NextResponse.json({ ok: true, phone, deviceToken });
    }

    /* type === "user" */
    const phone = normalizePhone(body.phone);
    if (!PHONE_RE.test(phone)) {
      return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
    }

    /* Resolve the account id (targeted notifications need it). The native
     * app may not know the uid, so look it up by phone. */
    let userId: string | null = body.userId ? String(body.userId) : null;
    let fullName = body.fullName ? String(body.fullName).slice(0, 120) : "";
    const user = await c.users.findOne({ phone });
    if (user) {
      if (!userId && user._id) userId = String(user._id);
      if (!fullName) fullName = user.fullName;
    }

    /* If this device previously registered as a guest, clean it up */
    if (isGuest(currentPhone) && currentToken) {
      const guest = await c.mobileDevices.findOne({ phone: currentPhone });
      if (guest && guest.deviceToken === currentToken) {
        await c.mobileDevices.deleteOne({ phone: currentPhone }).catch(() => {});
      }
    }

    const existing = await c.mobileDevices.findOne({ phone });
    if (existing) {
      await c.mobileDevices.updateOne(
        { phone },
        {
          $set: {
            userId,
            fullName,
            lastActiveAt: now,
            platform: body.platform === "android" ? "android" : existing.platform,
            ...(body.appVersion ? { appVersion: String(body.appVersion).slice(0, 20) } : {}),
            ...(fcmToken ? { fcmToken } : {}),
          },
        }
      );
      return NextResponse.json({ ok: true, phone, deviceToken: existing.deviceToken });
    }

    const deviceToken = newToken();
    await c.mobileDevices.insertOne({
      phone,
      userId,
      fullName,
      deviceToken,
      platform: body.platform === "android" ? "android" : "unknown",
      appVersion: body.appVersion ? String(body.appVersion).slice(0, 20) : undefined,
      fcmToken: fcmToken ?? null,
      createdAt: now,
      lastActiveAt: now,
    });
    return NextResponse.json({ ok: true, phone, deviceToken });
  } catch (e) {
    console.error("[mobile/register]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
