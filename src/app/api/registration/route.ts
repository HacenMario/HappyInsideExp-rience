import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/* Registration lifecycle (camp seats + payment):
   1) POST        -> status "pending"  (request recorded, waits for fee payment)
   2) admin PATCH -> status "confirmed" after the admin enters the paid amount
                     and presses "تم الدفع" (payment done)
   3) DELETE      -> status "cancelled" (by the user or the admin)
   Seats are OCCUPIED by pending + confirmed registrations. */

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ registration: null });
    const c = await collections();
    const reg = await c.registrations.findOne({
      userId: session.uid,
      status: { $in: ["pending", "confirmed"] },
    });
    return NextResponse.json({
      registration: reg ? { ...reg, _id: reg._id!.toString() } : null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const c = await collections();
    const settings = await c.settings.findOne({ key: "main" });
    if (!settings?.registrationOpen) {
      return NextResponse.json({ error: "closed" }, { status: 403 });
    }

    const existing = await c.registrations.findOne({
      userId: session.uid,
      status: { $in: ["pending", "confirmed"] },
    });
    if (existing) {
      return NextResponse.json(
        { error: "already_registered", status: existing.status },
        { status: 409 }
      );
    }

    // Seats are held by pending + confirmed registrations
    const occupied = await c.registrations.countDocuments({
      status: { $in: ["pending", "confirmed"] },
    });
    if (occupied >= settings.totalSeats) {
      return NextResponse.json({ error: "full" }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const { motivation } = body || {};

    await c.registrations.insertOne({
      userId: session.uid,
      userFullName: session.fullName,
      userPhone: session.phone,
      motivationAr: motivation ? String(motivation).slice(0, 500) : "",
      status: "pending", // stays pending until the admin validates the payment
      createdAt: new Date(),
    });

    const remaining = Math.max(0, settings.totalSeats - occupied - 1);
    return NextResponse.json({ ok: true, seatsLeft: remaining, status: "pending" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const c = await collections();
    await c.registrations.updateMany(
      { userId: session.uid, status: { $in: ["pending", "confirmed"] } },
      { $set: { status: "cancelled", cancelledAt: new Date() } }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
