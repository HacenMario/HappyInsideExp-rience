import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { collections } from "@/lib/mongodb";
import { ensureSeed } from "@/lib/seed";
import { signToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await ensureSeed();
    const { phone, password } = await req.json();
    if (!phone || !password) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const cleanPhone = String(phone).replace(/[\s-]/g, "");
    const c = await collections();
    const user = await c.users.findOne({ phone: cleanPhone });
    if (!user) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    const match = await bcrypt.compare(String(password), user.password);
    if (!match) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    if (user.status === "banned") {
      return NextResponse.json({ error: "banned" }, { status: 403 });
    }

    const token = signToken({
      uid: user._id!.toString(),
      phone: user.phone,
      role: user.role,
      fullName: user.fullName,
    });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, role: user.role });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
