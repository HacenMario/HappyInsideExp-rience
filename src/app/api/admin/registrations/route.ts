import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const c = await collections();
  const [list, settings] = await Promise.all([
    c.registrations.find().sort({ createdAt: -1 }).limit(500).toArray(),
    c.settings.findOne({ key: "main" }),
  ]);
  const fee = typeof settings?.fee === "number" ? settings.fee : 0;
  const studentFee =
    typeof settings?.studentFee === "number" ? settings.studentFee : fee;

  const userIds = [...new Set(list.map((r) => r.userId))];
  const users = await c.users
    .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
    .toArray();
  const userMap = new Map(users.map((u) => [u._id!.toString(), u]));

  const registrations = list.map((r) => {
    const u = userMap.get(r.userId);
    const accountType =
      r.accountType === "student" || u?.accountType === "student" ? "student" : "specialist";
    // Expected amount: stored snapshot, or computed from the current pricing
    const amountDue =
      typeof r.amountDue === "number"
        ? r.amountDue
        : accountType === "student"
          ? studentFee
          : fee;
    return {
      id: r._id!.toString(),
      userId: r.userId,
      fullName: u?.fullName || r.userFullName,
      phone: r.userPhone,
      gender: u?.gender || "male",
      accountType,
      amountDue,
      wilaya: u?.wilaya || "",
      workplace: u?.workplace || "",
      avatar: u?.avatar || null,
      status: r.status,
      amountPaid: r.amountPaid ?? null,
      paymentNote: r.paymentNote || "",
      paidAt: r.paidAt || null,
      motivation: r.motivationAr || "",
      createdAt: r.createdAt,
    };
  });

  /* ---- Money summary (computed live so cards auto-update) ----
     Each registration carries its own expected amount (student or
     specialist pricing), so totals mix both categories correctly. */
  const pending = registrations.filter((r) => r.status === "pending");
  const confirmed = registrations.filter((r) => r.status === "confirmed");
  const cancelled = registrations.filter((r) => r.status === "cancelled");
  const collected = confirmed.reduce((s, r) => s + (r.amountPaid || 0), 0);
  const expected = confirmed.reduce((s, r) => s + (r.amountDue ?? fee), 0);
  const pendingPotential = pending.reduce((s, r) => s + (r.amountDue ?? fee), 0);

  return NextResponse.json({
    registrations,
    summary: {
      fee,
      studentFee,
      pendingCount: pending.length,
      confirmedCount: confirmed.length,
      cancelledCount: cancelled.length,
      collected,
      expected,
      remaining: Math.max(0, expected - collected),
      pendingPotential,
    },
  });
}

/* POST = confirm payment ("تم الدفع"): validates the fee payment of a
   pending registration, stores the paid amount and confirms the seat. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const id = body?.id;
    const action = body?.action; // "confirm_payment" | "update_amount" | "unconfirm"
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    const c = await collections();
    const _id = new ObjectId(id);

    if (action === "confirm_payment" || action === "update_amount") {
      const amount = Math.max(0, Math.round(Number(body.amount) || 0));
      const note = body.note ? String(body.note).slice(0, 200) : "";
      const reg = await c.registrations.findOne({ _id });
      if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });

      // Confirming a payment requires (pending OR confirmed) status
      if (reg.status === "cancelled") {
        return NextResponse.json({ error: "cancelled_reg" }, { status: 409 });
      }

      // Seat availability check when confirming from pending
      if (reg.status === "pending") {
        const settings = await c.settings.findOne({ key: "main" });
        const totalSeats = settings?.totalSeats ?? 60;
        const occupied = await c.registrations.countDocuments({
          _id: { $ne: _id },
          status: { $in: ["pending", "confirmed"] },
        });
        if (occupied >= totalSeats) {
          return NextResponse.json({ error: "full" }, { status: 409 });
        }
      }

      await c.registrations.updateOne(
        { _id },
        {
          $set: {
            status: "confirmed",
            amountPaid: amount,
            paymentNote: note,
            paidAt: new Date(),
            confirmedAt: reg.confirmedAt || new Date(),
          },
        }
      );

      // Notify the user (bell + Android background notifications)
      if (reg.status === "pending") {
        await c.notifications
          .insertOne({
            userId: reg.userId,
            titleAr: "تم تأكيد دفعتك ✅",
            titleFr: "Paiement confirmé ✅",
            bodyAr: `مرحباً ${reg.userFullName}، تم تأكيد تسجيلك ودفعتك لمخيم Happy inside expérience${amount > 0 ? ` — المبلغ: ${amount} دج` : ""}. نراك في المخيم!`,
            bodyFr: `Bonjour ${reg.userFullName}, votre inscription et votre paiement pour le camp Happy inside expérience sont confirmés${amount > 0 ? ` — montant : ${amount} DA` : ""}. À très bientôt !`,
            link: "/dashboard",
            readBy: [],
            createdAt: new Date(),
          })
          .catch(() => {});
      }

      return NextResponse.json({ ok: true, amountPaid: amount });
    }

    if (action === "unconfirm") {
      // Reopen a confirmed registration back to pending (mistake correction)
      await c.registrations.updateOne(
        { _id, status: "confirmed" },
        { $set: { status: "pending" }, $unset: { amountPaid: "", paidAt: "", confirmedAt: "" } }
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const c = await collections();
  const reg = await c.registrations.findOne({ _id: new ObjectId(id) });
  await c.registrations.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "cancelled", cancelledAt: new Date() } }
  );

  // Notify the user (bell + Android background notifications)
  if (reg && reg.status !== "cancelled") {
    await c.notifications
      .insertOne({
        userId: reg.userId,
        titleAr: "تم إلغاء تسجيلك ❌",
        titleFr: "Inscription annulée ❌",
        bodyAr: `مرحباً ${reg.userFullName}، تم إلغاء تسجيلك في مخيم Happy inside expérience. للاستفسار يرجى التواصل معنا.`,
        bodyFr: `Bonjour ${reg.userFullName}, votre inscription au camp Happy inside expérience a été annulée. Contactez-nous pour toute question.`,
        link: "/dashboard",
        readBy: [],
        createdAt: new Date(),
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
