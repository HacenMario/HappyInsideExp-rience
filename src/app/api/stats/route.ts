import { NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const c = await collections();
    const settings = await c.settings.findOne({ key: "main" });
    const totalSeats = settings?.totalSeats ?? 60;
    // Seats are occupied by pending + confirmed registrations
    const registered = await c.registrations.countDocuments({
      status: { $in: ["pending", "confirmed"] },
    });
    const users = await c.users.countDocuments({ role: "user" });
    const speakers = await c.speakers.countDocuments({ active: true });
    const announcements = await c.announcements.countDocuments({ active: true });
    const seatsLeft = Math.max(0, totalSeats - registered);
    return NextResponse.json({
      totalSeats,
      registered,
      seatsLeft,
      users,
      speakers,
      announcements,
      fillPercent: totalSeats > 0 ? Math.round((registered / totalSeats) * 100) : 0,
      registrationOpen: settings?.registrationOpen ?? true,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
