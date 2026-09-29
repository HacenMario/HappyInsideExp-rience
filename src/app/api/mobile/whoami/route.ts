import { NextResponse } from "next/server";
import { collections } from "@/lib/mongodb";
import { getSession, publicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/* Mobile session probe — the Android app calls this on every full page load
 * (injected JS) and forwards the result to its native bridge, so the app
 * always knows which account (if any) should receive notifications. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null, unread: 0 });

  const c = await collections();
  const user = await c.users.findOne({ phone: session.phone });
  if (!user || user.status === "banned") {
    return NextResponse.json({ user: null, unread: 0 });
  }

  const uid = user._id ? String(user._id) : session.uid;
  const unread = await c.notifications.countDocuments({
    $or: [{ userId: null }, { userId: uid }],
    readBy: { $ne: uid },
  });

  return NextResponse.json({ user: publicUser(user), unread });
}
