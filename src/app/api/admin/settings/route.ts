import { NextRequest, NextResponse } from "next/server";
import { collections, type CampSettingsDoc } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const c = await collections();
  const settings = await c.settings.findOne({ key: "main" });
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const c = await collections();
    const allowed: (keyof CampSettingsDoc)[] = [
      "edition", "nameEn", "sloganAr", "sloganFr", "descAr", "descFr",
      "locationAr", "locationFr", "startDate", "endDate", "totalSeats",
      "registrationOpen", "whatsappNumber", "email", "facebookUrl", "instagramUrl",
      "announcementBarActive", "announcementBarFloating", "announcementBarTextAr",
      "announcementBarTextFr", "announcementBarLink",
    ];
    const update: Record<string, unknown> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) {
        if (k === "totalSeats" || k === "edition") {
          update[k] = Math.max(1, parseInt(String(body[k])) || 1);
        } else if (k === "registrationOpen" || k === "announcementBarActive" || k === "announcementBarFloating") {
          update[k] = !!body[k];
        } else {
          update[k] = String(body[k]);
        }
      }
    }

    // Participation fee (DZD, >= 0)
    if (body.fee !== undefined) {
      update.fee = Math.max(0, Math.round(Number(body.fee) || 0));
    }

    // Camp logo (base64 data URL or null to reset) — max ~2MB encoded
    if (body.logo !== undefined) {
      if (body.logo === null || body.logo === "") {
        update.logo = null;
      } else if (
        typeof body.logo === "string" &&
        /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/.test(body.logo) &&
        body.logo.length <= 2.8 * 1024 * 1024
      ) {
        update.logo = body.logo;
      }
    }

    // Landing / program images (base64 data URL or null to restore default)
    const IMAGE_FIELDS = ["heroImage", "programImage1", "programImage2"] as const;
    for (const field of IMAGE_FIELDS) {
      const v = body[field];
      if (v === undefined) continue;
      if (v === null || v === "") {
        update[field] = null;
      } else if (
        typeof v === "string" &&
        /^data:image\/(png|jpe?g|webp|gif);base64,/.test(v) &&
        v.length <= 8 * 1024 * 1024 // ~6MB file → ~8MB base64
      ) {
        update[field] = v;
      }
    }
    await c.settings.updateOne({ key: "main" }, { $set: update }, { upsert: true });
    const settings = await c.settings.findOne({ key: "main" });
    return NextResponse.json({ ok: true, settings });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
