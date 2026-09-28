import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const { name, type, subject, message } = await req.json();
    if (!subject || !message || (type !== "suggestion" && type !== "report")) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const c = await collections();
    await c.suggestions.insertOne({
      userId: session?.uid || null,
      name: name ? String(name).trim().slice(0, 120) : session?.fullName || "",
      type,
      subject: String(subject).trim().slice(0, 200),
      message: String(message).trim().slice(0, 3000),
      status: "new",
      createdAt: new Date(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
