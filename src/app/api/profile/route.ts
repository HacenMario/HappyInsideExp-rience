import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { getCurrentUser, publicUser } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json();
    const { fullName, wilaya, workplace, bio, avatar } = body;

    const c = await collections();
    const update: Record<string, unknown> = {};
    if (fullName) update.fullName = String(fullName).trim().slice(0, 120);
    if (wilaya !== undefined) update.wilaya = String(wilaya).slice(0, 80);
    if (workplace !== undefined) update.workplace = String(workplace).slice(0, 160);
    if (bio !== undefined) update.bio = String(bio).slice(0, 600);
    if (avatar !== undefined) update.avatar = avatar; // base64 data URL or null

    await c.users.updateOne({ _id: user._id! }, { $set: update });
    const updated = await c.users.findOne({ _id: user._id! });
    return NextResponse.json({ ok: true, user: updated ? publicUser(updated) : null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
