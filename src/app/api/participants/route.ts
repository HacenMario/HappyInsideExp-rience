import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { ensureSeed } from "@/lib/seed";
import { edgeCacheHeaders, memoJson } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await memoJson("participants", 30_000, async () => {
      await ensureSeed();
      const c = await collections();
      // Participants = confirmed camp registrations joined with user info
      const regs = await c.registrations
        .find({ status: "confirmed" })
        .sort({ createdAt: -1 })
        .toArray();

      const userIds = regs.map((r) => r.userId);
      const users = await c.users
        .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
        .toArray();
      const userMap = new Map(users.map((u) => [u._id!.toString(), u]));

      const participants = regs
        .map((r) => {
          const u = userMap.get(r.userId);
          if (!u || u.role === "admin") return null;
          return {
            registrationId: r._id!.toString(),
            fullName: u.fullName,
            gender: u.gender,
            wilaya: u.wilaya || "",
            workplace: u.workplace || "",
            bio: u.bio || "",
            avatar: u.avatar || null,
            joinedAt: r.createdAt,
          };
        })
        .filter(Boolean);

      const males = participants.filter((p) => p!.gender === "male").length;
      const females = participants.filter((p) => p!.gender === "female").length;

      return { participants, males, females, total: participants.length };
    });
    return NextResponse.json(payload, { headers: edgeCacheHeaders(30, 120) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
