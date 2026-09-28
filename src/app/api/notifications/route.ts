import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    const c = await collections();
    const query = session
      ? { $or: [{ userId: null }, { userId: session.uid }] }
      : { userId: null };
    const list = await c.notifications
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const readBy = session
      ? list.filter((n) => n.readBy?.includes(session.uid)).map((n) => n._id!.toString())
      : list.map((n) => n._id!.toString());

    return NextResponse.json({
      notifications: list.map((n) => ({
        id: n._id!.toString(),
        titleAr: n.titleAr,
        titleFr: n.titleFr,
        bodyAr: n.bodyAr,
        bodyFr: n.bodyFr,
        link: n.link || null,
        read: readBy.includes(n._id!.toString()),
        createdAt: n.createdAt,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const { id } = await req.json();
    const c = await collections();
    if (session) {
      await c.notifications.updateOne(
        { _id: new ObjectId(id) },
        { $addToSet: { readBy: session.uid } }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PUT() {
  try {
    const session = await getSession();
    const c = await collections();
    if (session) {
      await c.notifications.updateMany(
        { $or: [{ userId: null }, { userId: session.uid }] },
        { $addToSet: { readBy: session.uid } }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
