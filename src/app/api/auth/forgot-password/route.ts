import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { collections } from "@/lib/mongodb";

const SECRET = process.env.AUTH_SECRET || "happy-inside-experience-super-secret-2026";

// Get recovery question for a phone number
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = (searchParams.get("phone") || "").replace(/[\s-]/g, "");
    if (!phone) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const c = await collections();
    const user = await c.users.findOne({ phone });
    if (!user) return NextResponse.json({ error: "phone_not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, recoveryQuestion: user.recoveryQuestion || "" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// Step 1: verify phone + recovery answer -> return reset token
export async function POST(req: NextRequest) {
  try {
    const { phone, recoveryAnswer } = await req.json();
    if (!phone || !recoveryAnswer) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const cleanPhone = String(phone).replace(/[\s-]/g, "");
    const c = await collections();
    const user = await c.users.findOne({ phone: cleanPhone });
    if (!user) {
      return NextResponse.json({ error: "phone_not_found" }, { status: 404 });
    }
    const match = await bcrypt.compare(String(recoveryAnswer).trim().toLowerCase(), user.recoveryAnswer || "");
    if (!match) {
      return NextResponse.json({ error: "wrong_answer" }, { status: 401 });
    }
    const resetToken = jwt.sign({ uid: user._id!.toString(), purpose: "reset" }, SECRET, { expiresIn: "15m" });
    return NextResponse.json({ ok: true, resetToken });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
