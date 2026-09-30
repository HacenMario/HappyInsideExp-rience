import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { collections } from "@/lib/mongodb";
import { ensureSeed } from "@/lib/seed";
import { signToken, setSessionCookie } from "@/lib/auth";

const PHONE_RE = /^(0)(5|6|7)[0-9]{8}$/;

export async function POST(req: NextRequest) {
  try {
    await ensureSeed();
    const body = await req.json();
    const { fullName, phone, password, gender, accountType, wilaya, workplace, bio, recoveryQuestion, recoveryAnswer } = body;

    if (!fullName || !phone || !password || !gender || !recoveryQuestion || !recoveryAnswer) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const cleanPhone = String(phone).replace(/[\s-]/g, "");
    if (!PHONE_RE.test(cleanPhone)) {
      return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: "password_short" }, { status: 400 });
    }
    if (gender !== "male" && gender !== "female") {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    // Pricing category chosen at signup (student / specialist). Unknown or
    // missing values fall back to "specialist" so older clients keep working.
    const cleanAccountType = accountType === "student" ? "student" : "specialist";

    const c = await collections();
    const existing = await c.users.findOne({ phone: cleanPhone });
    if (existing) {
      return NextResponse.json({ error: "phone_exists" }, { status: 409 });
    }

    const result = await c.users.insertOne({
      fullName: String(fullName).trim(),
      phone: cleanPhone,
      password: await bcrypt.hash(String(password), 10),
      gender,
      accountType: cleanAccountType,
      wilaya: wilaya ? String(wilaya).trim() : "الجزائر",
      workplace: workplace ? String(workplace).trim() : "",
      bio: bio ? String(bio).trim() : "",
      avatar: null,
      role: "user",
      recoveryQuestion: String(recoveryQuestion),
      recoveryAnswer: await bcrypt.hash(String(recoveryAnswer).trim().toLowerCase(), 10),
      status: "active",
      createdAt: new Date(),
    });

    const token = signToken({
      uid: result.insertedId.toString(),
      phone: cleanPhone,
      role: "user",
      fullName: String(fullName).trim(),
    });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, role: "user" });
  } catch (e) {
    // Concurrent registrations with the same phone: the unique index on
    // users.phone rejects the second insert — surface it as 409.
    if ((e as { code?: number })?.code === 11000) {
      return NextResponse.json({ error: "phone_exists" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
