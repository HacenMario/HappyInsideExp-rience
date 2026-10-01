import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/* Waiting list for users without an active registration when all camp
 * seats are taken. Promotion happens FIFO (oldest waiting first) by the
 * admin — see /api/admin/waitlist. */

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const c = await collections();
    const entry = await c.waitlist.findOne({
      userId: session.uid,
      status: { $in: ["waiting", "promoted"] },
    });
    if (!entry) return NextResponse.json({ waitlist: null });
    const position =
      entry.status === "promoted"
        ? 0
        : (await c.waitlist.countDocuments({
            status: "waiting",
            createdAt: { $lte: entry.createdAt },
          })) || 1;
    return NextResponse.json({
      waitlist: {
        id: entry._id!.toString(),
        status: entry.status,
        position,
        createdAt: entry.createdAt,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const c = await collections();

    const existingReg = await c.registrations.findOne({
      userId: session.uid,
      status: { $in: ["pending", "confirmed"] },
    });
    if (existingReg) {
      return NextResponse.json({ error: "already_registered" }, { status: 409 });
    }

    const existing = await c.waitlist.findOne({
      userId: session.uid,
      status: { $in: ["waiting", "promoted"] },
    });
    if (existing) {
      return NextResponse.json({ error: "already_in_waitlist" }, { status: 409 });
    }

    const settings = await c.settings.findOne({ key: "main" });
    if (!settings) return NextResponse.json({ error: "server_error" }, { status: 500 });

    // Joining the waitlist only makes sense when the seats are actually full
    const occupied = await c.registrations.countDocuments({
      status: { $in: ["pending", "confirmed"] },
    });
    if (!settings.registrationOpen || occupied < settings.totalSeats) {
      return NextResponse.json({ error: "not_full" }, { status: 409 });
    }

    // Account category (pricing snapshot, like a regular booking)
    let accountType: "student" | "specialist" = "specialist";
    let wilaya = "";
    try {
      const user = await c.users.findOne({ _id: new ObjectId(session.uid) });
      if (user?.accountType === "student") accountType = "student";
      wilaya = user?.wilaya || "";
    } catch {
      // invalid uid shape → keep the defaults
    }

    await c.waitlist.insertOne({
      userId: session.uid,
      fullName: session.fullName,
      phone: session.phone,
      accountType,
      wilaya,
      status: "waiting",
      createdAt: new Date(),
    });

    const position = (await c.waitlist.countDocuments({ status: "waiting" })) || 1;
    return NextResponse.json({ ok: true, position });
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
    await c.waitlist.updateMany(
      { userId: session.uid, status: "waiting" },
      { $set: { status: "left" } }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
