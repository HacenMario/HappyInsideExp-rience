import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";

const SECRET = process.env.AUTH_SECRET || "happy-inside-experience-super-secret-2026";

export async function POST(req: NextRequest) {
  try {
    const { resetToken, password, confirmPassword } = await req.json();
    if (!resetToken || !password) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: "password_short" }, { status: 400 });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json({ error: "password_mismatch" }, { status: 400 });
    }
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(String(resetToken), SECRET) as jwt.JwtPayload;
    } catch {
      return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }
    if (payload.purpose !== "reset" || !payload.uid) {
      return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }
    const c = await collections();
    await c.users.updateOne(
      { _id: new ObjectId(payload.uid as string) },
      { $set: { password: await bcrypt.hash(String(password), 10) } }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
