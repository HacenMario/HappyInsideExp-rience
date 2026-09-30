import { NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const c = await collections();
    const settings = await c.settings.findOne({ key: "main" });
    const totalSeats = settings?.totalSeats ?? 60;
    const fee = typeof settings?.fee === "number" ? settings.fee : 0;

    const [totalUsers, totalAdmins, occupied, confirmedCount, pendingCount, males, females, annCount, unreadMessages, suggestionsCount, mediaCount, pushSubsCount] =
      await Promise.all([
        c.users.countDocuments({ role: "user" }),
        c.users.countDocuments({ role: "admin" }),
        // Seats are occupied by pending + confirmed registrations
        c.registrations.countDocuments({ status: { $in: ["pending", "confirmed"] } }),
        c.registrations.countDocuments({ status: "confirmed" }),
        c.registrations.countDocuments({ status: "pending" }),
        c.users.countDocuments({ role: "user", gender: "male" }),
        c.users.countDocuments({ role: "user", gender: "female" }),
        c.announcements.countDocuments({ active: true }),
        c.contactMessages.countDocuments({ read: false }),
        c.suggestions.countDocuments(),
        c.media.countDocuments(),
        c.pushSubs.countDocuments(),
      ]);

    // ---- Money summary (auto-updates with every admin action) ----
    const collectedAgg = await c.registrations
      .aggregate<{ total: number }>([
        { $match: { status: "confirmed" } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$amountPaid", 0] } } } },
      ])
      .toArray();
    const collected = collectedAgg[0]?.total || 0;
    // Expected/potential amounts use each registration's own pricing
    // (student vs specialist) via amountDue, falling back to the type price.
    const studentFee =
      typeof settings?.studentFee === "number" ? settings.studentFee : fee;
    const allRegs = await c.registrations
      .find({ status: { $in: ["pending", "confirmed"] } })
      .toArray();
    const typePrice = (r: { accountType?: string; amountDue?: number }) =>
      typeof r.amountDue === "number"
        ? r.amountDue
        : r.accountType === "student"
          ? studentFee
          : fee;
    const expected = allRegs
      .filter((r) => r.status === "confirmed")
      .reduce((s, r) => s + typePrice(r), 0);
    const pendingPotential = allRegs
      .filter((r) => r.status === "pending")
      .reduce((s, r) => s + typePrice(r), 0);
    const money = {
      fee,
      studentFee,
      collected,
      expected,
      remaining: Math.max(0, expected - collected),
      pendingCount,
      pendingPotential,
      confirmedCount,
    };

    const recentRegistrations = await c.registrations
      .find({ status: { $in: ["pending", "confirmed"] } })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    const recentMessages = await c.contactMessages
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Daily registration trend (last 14 days, non-cancelled)
    const trend: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = await c.registrations.countDocuments({
        status: { $in: ["pending", "confirmed"] },
        createdAt: { $gte: d, $lt: next },
      });
      trend.push({ date: d.toISOString().slice(5, 10), count });
    }

    return NextResponse.json({
      totalUsers,
      totalAdmins,
      totalRegistered: occupied,
      confirmedCount,
      pendingCount,
      totalSeats,
      seatsLeft: Math.max(0, totalSeats - occupied),
      fillPercent: totalSeats ? Math.round((occupied / totalSeats) * 100) : 0,
      money,
      males,
      females,
      annCount,
      unreadMessages,
      suggestionsCount,
      mediaCount,
      pushSubsCount,
      registrationOpen: settings?.registrationOpen ?? false,
      trend,
      recentRegistrations: recentRegistrations.map((r) => ({
        id: r._id!.toString(),
        fullName: r.userFullName,
        phone: r.userPhone,
        status: r.status,
        createdAt: r.createdAt,
      })),
      recentMessages: recentMessages.map((m) => ({
        id: m._id!.toString(),
        name: m.name,
        subject: m.subject,
        read: m.read,
        createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
