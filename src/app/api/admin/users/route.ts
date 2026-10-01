import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { collections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const c = await collections();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const filter = q
    ? { $or: [{ fullName: { $regex: q, $options: "i" } }, { phone: { $regex: q } }] }
    : {};
  const list = await c.users.find(filter).sort({ createdAt: -1 }).limit(200).toArray();
  return NextResponse.json({
    users: list.map((u) => ({
      id: u._id!.toString(),
      fullName: u.fullName,
      phone: u.phone,
      gender: u.gender,
      accountType: (u.accountType === "student" ? "student" : "specialist") as
        | "student"
        | "specialist",
      wilaya: u.wilaya || "",
      workplace: u.workplace || "",
      bio: u.bio || "",
      avatar: u.avatar || null,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      recoveryQuestion: u.recoveryQuestion || "",
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { id, action, value } = await req.json();
    const c = await collections();
    const target = await c.users.findOne({ _id: new ObjectId(id) });
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (target.role === "admin" && action !== "reset_password") {
      return NextResponse.json({ error: "cannot_modify_admin" }, { status: 403 });
    }

    switch (action) {
      case "ban":
        await c.users.updateOne({ _id: target._id! }, { $set: { status: "banned" } });
        break;
      case "unban":
        await c.users.updateOne({ _id: target._id! }, { $set: { status: "active" } });
        break;
      case "reset_password":
        if (!value || String(value).length < 8) {
          return NextResponse.json({ error: "password_short" }, { status: 400 });
        }
        await c.users.updateOne(
          { _id: target._id! },
          { $set: { password: await bcrypt.hash(String(value), 10) } }
        );
        break;
      default:
        return NextResponse.json({ error: "unknown_action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const c = await collections();
    const target = await c.users.findOne({ _id: new ObjectId(id) });
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (target.role === "admin") {
      return NextResponse.json({ error: "cannot_delete_admin" }, { status: 403 });
    }
    await c.users.deleteOne({ _id: target._id! });
    await c.registrations.deleteMany({ userId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
