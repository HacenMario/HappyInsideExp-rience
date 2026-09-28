import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { getVapidPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const key = await getVapidPublicKey();
    return NextResponse.json({ publicKey: key });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sub = await req.json();
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
    }
    const c = await collections();
    await c.pushSubs.updateOne(
      { endpoint: sub.endpoint },
      { $set: { endpoint: sub.endpoint, keys: sub.keys, createdAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sub = await req.json();
    if (sub?.endpoint) {
      const c = await collections();
      await c.pushSubs.deleteOne({ endpoint: sub.endpoint });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
