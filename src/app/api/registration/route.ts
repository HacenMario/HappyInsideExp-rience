import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { ensureBookingCode, generateBookingCode } from "@/lib/booking-code";

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
    if (reg) await ensureBookingCode(reg);

    // chronological seat number (rank among active registrations) — used by
    // the shareable story card ("المشارك رقم N")
    let seatNumber: number | null = null;
    if (reg?.createdAt) {
      seatNumber = (await c.registrations.countDocuments({
        status: { $in: ["pending", "confirmed"] },
        createdAt: { $lte: reg.createdAt },
      })) || 1;
    }

    // Waiting-list state for users without an active registration
    let waitlist: {
      position: number;
      status: "waiting" | "promoted";
      createdAt: Date;
    } | null = null;
    if (!reg) {
      const entry = await c.waitlist.findOne({
        userId: session.uid,
        status: { $in: ["waiting", "promoted"] },
      });
      if (entry) {
        const position =
          entry.status === "promoted"
            ? 0
            : (await c.waitlist.countDocuments({
                status: "waiting",
                createdAt: { $lte: entry.createdAt },
              })) || 1;
        waitlist = {
          position,
          status: entry.status === "promoted" ? "promoted" : "waiting",
          createdAt: entry.createdAt,
        };
      }
    }

    return NextResponse.json({
      registration: reg
        ? {
            ...reg,
            _id: reg._id!.toString(),
            code: reg.code,
            attended: !!reg.attended,
            seatNumber,
            certificate: reg.certificate?.issued
              ? { issued: true, number: reg.certificate.number, issuedAt: reg.certificate.issuedAt }
              : null,
          }
        : null,
      waitlist,
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
      return NextResponse.json(
        { error: "full", waitlistAvailable: true },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { motivation } = body || {};

    // Pricing category of the registrant (falls back to specialist for
    // legacy accounts created before accountType existed).
    let accountType: "student" | "specialist" = "specialist";
    let userWilaya = "";
    try {
      const user = await c.users.findOne({ _id: new ObjectId(session.uid) });
      if (user?.accountType === "student") accountType = "student";
      if (user?.wilaya) userWilaya = user.wilaya;
    } catch {
      // invalid uid shape → keep the default
    }
    const amountDue =
      accountType === "student"
        ? typeof settings.studentFee === "number"
          ? settings.studentFee
          : settings.fee ?? 0
        : settings.fee ?? 0;

    const code = await (async () => {
      // unique booking code for the participant card + QR
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateBookingCode();
        const clash = await c.registrations.findOne({ code: candidate });
        if (!clash) return candidate;
      }
      return `HIEX-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    })();

    await c.registrations.insertOne({
      userId: session.uid,
      userFullName: session.fullName,
      userPhone: session.phone,
      accountType,
      amountDue,
      motivationAr: motivation ? String(motivation).slice(0, 500) : "",
      code,
      status: "pending", // stays pending until the admin validates the payment
      createdAt: new Date(),
    });

    /* Task 21 — instant notification for EVERY admin with the FULL booking
     * details; clicking it opens the "تسجيلات المخيم" admin tab. */
    try {
      const admins = await c.users
        .find({ role: "admin" }, { projection: { _id: 1 } })
        .toArray();
      if (admins.length > 0) {
        const seatNo = occupied + 1;
        const catAr = accountType === "student" ? "طالب/طالبة" : "أخصائي/أخصائية";
        const catFr = accountType === "student" ? "Étudiant·e" : "Psychologue";
        const now = new Date();
        const docs = admins.map((adm) => ({
          userId: adm._id!.toString(),
          titleAr: "🎉 حجز مقعد جديد في المخيم!",
          titleFr: "🎉 Nouvelle réservation de place !",
          bodyAr:
            `${session.fullName} حجز المقعد رقم ${seatNo} من أصل ${settings.totalSeats}.\n` +
            `📱 الهاتف: ${session.phone}\n` +
            `👤 الفئة: ${catAr}\n` +
            `📍 الولاية: ${userWilaya || "غير محددة"}\n` +
            `🔖 رمز الحجز: ${code}\n` +
            `💰 المبلغ المستحق: ${new Intl.NumberFormat("fr-FR").format(amountDue)} دج\n` +
            `⏳ الحالة: بانتظار تأكيد الدفع — اضغط لفتح «تسجيلات المخيم».`,
          bodyFr:
            `${session.fullName} a réservé la place n° ${seatNo} sur ${settings.totalSeats}.\n` +
            `📱 Téléphone : ${session.phone}\n` +
            `👤 Catégorie : ${catFr}\n` +
            `📍 Wilaya : ${userWilaya || "non précisée"}\n` +
            `🔖 Code de réservation : ${code}\n` +
            `💰 Montant dû : ${new Intl.NumberFormat("fr-FR").format(amountDue)} DA\n` +
            `⏳ Statut : en attente de confirmation du paiement — cliquez pour ouvrir « Inscriptions au camp ».`,
          link: "/admin?tab=registrations",
          readBy: [] as string[],
          createdAt: now,
        }));
        await c.notifications.insertMany(docs);
      }
    } catch (e) {
      // the booking itself already succeeded — never fail it because of the notify
      console.error("admin booking notification failed", e);
    }

    const remaining = Math.max(0, settings.totalSeats - occupied - 1);
    return NextResponse.json({ ok: true, seatsLeft: remaining, status: "pending", accountType, amountDue });
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
