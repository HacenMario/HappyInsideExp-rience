import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { generateBookingCode } from "@/lib/booking-code";

export const dynamic = "force-dynamic";

/* Admin view of the waiting list:
 * GET                          -> waiting people, FIFO order (position 1 = next)
 * POST { id, action: "promote" } -> convert the next waiting person into a real
 *                                   pending registration (if a seat is free) + notify them
 * POST { id, action: "remove" }  -> remove someone from the waiting list */

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const c = await collections();
    const [settings, waiting] = await Promise.all([
      c.settings.findOne({ key: "main" }),
      c.waitlist.find({ status: "waiting" }).sort({ createdAt: 1 }).limit(200).toArray(),
    ]);
    const totalSeats = settings?.totalSeats ?? 60;
    const occupied = await c.registrations.countDocuments({
      status: { $in: ["pending", "confirmed"] },
    });
    const promoted = await c.waitlist
      .find({ status: "promoted" })
      .sort({ promotedAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      totalSeats,
      occupied,
      seatsLeft: Math.max(0, totalSeats - occupied),
      waiting: waiting.map((w, i) => ({
        id: w._id!.toString(),
        fullName: w.fullName,
        phone: w.phone,
        accountType: w.accountType,
        wilaya: w.wilaya || "",
        position: i + 1,
        createdAt: w.createdAt,
      })),
      promotedCount: promoted.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const id = body?.id;
    const action = body?.action;
    if (!id || (action !== "promote" && action !== "remove")) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const c = await collections();
    const entry = await c.waitlist.findOne({ _id: new ObjectId(id) });
    if (!entry || entry.status !== "waiting") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (action === "remove") {
      await c.waitlist.updateOne(
        { _id: entry._id },
        { $set: { status: "left" } }
      );
      return NextResponse.json({ ok: true, removed: true });
    }

    /* ---- PROMOTE ---- */
    const settings = await c.settings.findOne({ key: "main" });
    if (!settings?.registrationOpen) {
      return NextResponse.json({ error: "closed" }, { status: 409 });
    }
    // Guard: the person may have booked or been promoted in the meantime
    const dupReg = await c.registrations.findOne({
      userId: entry.userId,
      status: { $in: ["pending", "confirmed"] },
    });
    if (dupReg) {
      await c.waitlist.updateOne({ _id: entry._id }, { $set: { status: "promoted", promotedAt: new Date(), promotedRegistrationId: dupReg._id!.toString() } });
      return NextResponse.json({ ok: true, alreadyRegistered: true });
    }
    const dupWait = await c.waitlist.findOne({ userId: entry.userId, status: "promoted" });
    if (dupWait && dupWait._id!.toString() !== entry._id!.toString()) {
      await c.waitlist.updateOne({ _id: entry._id }, { $set: { status: "left" } });
      return NextResponse.json({ ok: true, alreadyRegistered: true });
    }

    const occupied = await c.registrations.countDocuments({
      status: { $in: ["pending", "confirmed"] },
    });
    const totalSeats = settings.totalSeats ?? 60;
    if (occupied >= totalSeats) {
      return NextResponse.json({ error: "full" }, { status: 409 });
    }

    // Pricing snapshot exactly like a self-service booking
    let accountType: "student" | "specialist" = "specialist";
    try {
      const user = await c.users.findOne({ _id: new ObjectId(entry.userId) });
      if (user?.accountType === "student") accountType = "student";
    } catch {
      // keep the default
    }
    const amountDue =
      accountType === "student"
        ? typeof settings.studentFee === "number"
          ? settings.studentFee
          : settings.fee ?? 0
        : settings.fee ?? 0;

    const code = generateBookingCode();
    const result = await c.registrations.insertOne({
      userId: entry.userId,
      userFullName: entry.fullName,
      userPhone: entry.phone,
      accountType,
      amountDue,
      motivationAr: "",
      code,
      status: "pending",
      createdAt: new Date(),
    });

    await c.waitlist.updateOne(
      { _id: entry._id },
      {
        $set: {
          status: "promoted",
          promotedAt: new Date(),
          promotedRegistrationId: result.insertedId.toString(),
        },
      }
    );

    // Notify the promoted person (bell + Android background notifications)
    await c.notifications
      .insertOne({
        userId: entry.userId,
        titleAr: "🎉 جاء دورك — مقعدك متاح!",
        titleFr: "🎉 C'est ton tour — ta place est libérée !",
        bodyAr: `مرحباً ${entry.fullName}، تمت ترقيتك من قائمة الانتظار إلى قائمة المشاركين في مخيم Happy inside expérience. أكمل سداد المستحقات (${amountDue > 0 ? `${amountDue} دج` : "لا توجد مستحقات"}) لتثبيت مقعدك خلال أقرب وقت.`,
        bodyFr: `Bonjour ${entry.fullName}, tu viens d'être promu(e) de la liste d'attente à la liste des participants du camp Happy inside expérience. Finalise le paiement (${amountDue > 0 ? `${amountDue} DA` : "aucun frais"}) pour confirmer ta place au plus vite.`,
        link: "/dashboard?tab=registration",
        readBy: [],
        createdAt: new Date(),
      })
      .catch(() => {});

    return NextResponse.json({
      ok: true,
      promoted: {
        fullName: entry.fullName,
        phone: entry.phone,
        accountType,
        registrationId: result.insertedId.toString(),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
