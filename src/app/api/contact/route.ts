import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const { name, phone, email, subject, message } = await req.json();
    if (!name || !phone || !subject || !message) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const c = await collections();
    await c.contactMessages.insertOne({
      name: String(name).trim().slice(0, 120),
      phone: String(phone).trim().slice(0, 30),
      email: email ? String(email).trim().slice(0, 160) : "",
      subject: String(subject).trim().slice(0, 200),
      message: String(message).trim().slice(0, 2000),
      read: false,
      createdAt: new Date(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
