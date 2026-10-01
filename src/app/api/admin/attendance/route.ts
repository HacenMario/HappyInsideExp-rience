import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { ensureBookingCode } from "@/lib/booking-code";

export const dynamic = "force-dynamic";

/* Camp-gate attendance (check-in):
 * POST { code }            -> validate a booking code (from the QR card or typed manually)
 * POST { id, action:"undo" } -> revert an accidental check-in
 * Only CONFIRMED registrations can check in (payment must be validated first). */

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const c = await collections();

    if (body?.action === "undo") {
      const id = body?.id;
      if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
      const { ObjectId } = await import("mongodb");
      const reg = await c.registrations.findOne({ _id: new ObjectId(id) });
      if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });
      if (!reg.attended) return NextResponse.json({ error: "not_attended" }, { status: 409 });
      await c.registrations.updateOne(
        { _id: reg._id },
        { $unset: { attended: "", attendedAt: "", checkedInBy: "" } }
      );
      return NextResponse.json({ ok: true, undone: true });
    }

    const rawCode = String(body?.code || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
    if (!rawCode) return NextResponse.json({ error: "missing_code" }, { status: 400 });

    // Accept both "HIEX-XXXXXX" and the bare suffix "XXXXXX"
    const normalized = rawCode.startsWith("HIEX-") ? rawCode : `HIEX-${rawCode}`;

    const reg = await c.registrations.findOne({ code: normalized });
    if (!reg) {
      return NextResponse.json({ error: "invalid_code" }, { status: 404 });
    }
    await ensureBookingCode(reg);

    if (reg.status === "cancelled") {
      return NextResponse.json({ error: "cancelled_reg" }, { status: 409 });
    }
    if (reg.status === "pending") {
      return NextResponse.json(
        {
          error: "not_confirmed",
          participant: { fullName: reg.userFullName, phone: reg.userPhone },
        },
        { status: 409 }
      );
    }

    if (reg.attended) {
      return NextResponse.json({
        ok: true,
        already: true,
        attendedAt: reg.attendedAt,
        participant: {
          id: reg._id!.toString(),
          fullName: reg.userFullName,
          phone: reg.userPhone,
          accountType: reg.accountType || "specialist",
          wilaya: "",
          code: reg.code,
        },
      });
    }

    const now = new Date();
    await c.registrations.updateOne(
      { _id: reg._id },
      { $set: { attended: true, attendedAt: now, checkedInBy: admin.fullName } }
    );

    return NextResponse.json({
      ok: true,
      already: false,
      attendedAt: now,
      participant: {
        id: reg._id!.toString(),
        fullName: reg.userFullName,
        phone: reg.userPhone,
        accountType: reg.accountType || "specialist",
        wilaya: "",
        code: reg.code,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
