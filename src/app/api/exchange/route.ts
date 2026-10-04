import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections, type UserDoc } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { WILAYAS } from "@/lib/wilayas";

export const dynamic = "force-dynamic";

/* ============================================================
 * QR CARD EXCHANGE (Task 20) — professional networking
 *
 * GET ?code=HIEX-XXXXXX
 *   Auth required (any active logged-in user). Resolves the booking
 *   code to the participant's PUBLIC exchange profile:
 *     fullName, category, wilaya (+FR), workplace, bio, avatar
 *     phone ONLY when the owner opted in (sharePhone=true).
 *   Never leaks phone/email/credentials otherwise.
 *
 * PUT { sharePhone: boolean }
 *   Auth required — toggles MY OWN "reveal phone on scan" switch.
 * ============================================================ */

const maskName = (full: string): string => {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0] || "";
  if (parts.length === 1) return first;
  const initial = (parts[1] || "").charAt(0);
  return initial ? `${first} ${initial}.` : first;
};

export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me || me.status !== "active") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const code = (req.nextUrl.searchParams.get("code") || "").trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "missing_code" }, { status: 400 });
    const normalized = code.startsWith("HIEX-") ? code : `HIEX-${code}`;

    const c = await collections();
    const reg = await c.registrations.findOne({
      code: normalized,
      status: { $in: ["pending", "confirmed"] },
    });
    if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });

    let owner: UserDoc | null = null;
    if (/^[0-9a-fA-F]{24}$/.test(String(reg.userId))) {
      owner = await c.users.findOne({ _id: new ObjectId(String(reg.userId)) });
    }
    if (!owner || owner.status !== "active") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const wilayaAr = String(owner.wilaya || "");
    const isSelf = String(me._id) === String(owner._id);

    return NextResponse.json({
      isSelf,
      code: normalized,
      status: reg.status,
      attended: !!reg.attended,
      fullName: isSelf ? owner.fullName : maskName(String(owner.fullName || "")),
      accountType: owner.accountType === "student" ? "student" : "specialist",
      wilaya: wilayaAr,
      wilayaFr: WILAYAS.find((w) => w.ar === wilayaAr)?.fr || "",
      workplace: String(owner.workplace || ""),
      bio: String(owner.bio || ""),
      avatar: owner.avatar || null,
      // phone is revealed ONLY when the owner opted in (and never to self echo)
      phone: !isSelf && owner.sharePhone === true ? String(owner.phone || "") : null,
    });
  } catch (e) {
    console.error("[exchange GET]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me || me.status !== "active") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const sharePhone = body?.sharePhone === true;
    const c = await collections();
    await c.users.updateOne({ _id: me._id! }, { $set: { sharePhone } });
    return NextResponse.json({ ok: true, sharePhone });
  } catch (e) {
    console.error("[exchange PUT]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/* GET my current exchange preference (used by the dashboard dialog) */
export async function POST() {
  try {
    const me = await getCurrentUser();
    if (!me || me.status !== "active") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ sharePhone: me.sharePhone === true });
  } catch (e) {
    console.error("[exchange POST]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
