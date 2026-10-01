import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/auth";
import { nextCertificateNumber } from "@/lib/booking-code";

export const dynamic = "force-dynamic";

/* Attendance certificates — issued by the ADMIN ONLY:
 * POST { id, action: "issue" }            -> issue one certificate (confirmed registration)
 * POST { id, action: "revoke" }           -> revoke a previously issued certificate
 * POST { action: "issue_all_attended" }   -> bulk issue for every attended participant
 * The participant can only SEE/DOWNLOAD the certificate after it is issued here. */

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const c = await collections();

    if (action === "issue_all_attended") {
      const attended = await c.registrations
        .find({ status: "confirmed", attended: true, "certificate.issued": { $ne: true } })
        .toArray();
      let issued = 0;
      for (const reg of attended) {
        const number = await nextCertificateNumber();
        await c.registrations.updateOne(
          { _id: reg._id },
          {
            $set: {
              certificate: {
                issued: true,
                issuedAt: new Date(),
                number,
                issuedBy: admin.fullName,
              },
            }
          }
        );
        await c.notifications
          .insertOne({
            userId: reg.userId,
            titleAr: "🏅 شهادتك جاهزة!",
            titleFr: "🏅 Votre certificat est prêt !",
            bodyAr: `مرحباً ${reg.userFullName}، أصدرت إدارة المخيم شهادة حضورك لـ Happy inside expérience (${number}). حمّلها الآن من لوحة تحكمك في تبويب «تسجيلي».`,
            bodyFr: `Bonjour ${reg.userFullName}, le certificat de présence du camp Happy inside expérience (${number}) vient d'être émis. Télécharge-le depuis ton tableau de bord, onglet « Mon inscription ».`,
            link: "/certificate",
            readBy: [],
            createdAt: new Date(),
          })
          .catch(() => {});
        issued++;
      }
      return NextResponse.json({ ok: true, issued });
    }

    const id = body?.id;
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const _id = new ObjectId(id);
    const reg = await c.registrations.findOne({ _id });
    if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (action === "issue") {
      if (reg.status !== "confirmed") {
        return NextResponse.json({ error: "not_confirmed" }, { status: 409 });
      }
      if (reg.certificate?.issued) {
        return NextResponse.json({ ok: true, already: true, number: reg.certificate.number });
      }
      const number = await nextCertificateNumber();
      await c.registrations.updateOne(
        { _id },
        {
          $set: {
            certificate: {
              issued: true,
              issuedAt: new Date(),
              number,
              issuedBy: admin.fullName,
            },
          }
        }
      );
      await c.notifications
        .insertOne({
          userId: reg.userId,
          titleAr: "🏅 شهادتك جاهزة!",
          titleFr: "🏅 Votre certificat est prêt !",
          bodyAr: `مرحباً ${reg.userFullName}، أصدرت إدارة المخيم شهادة حضورك لـ Happy inside expérience (${number}). حمّلها الآن من لوحة تحكمك في تبويب «تسجيلي».`,
          bodyFr: `Bonjour ${reg.userFullName}, le certificat de présence du camp Happy inside expérience (${number}) vient d'être émis. Télécharge-le depuis ton tableau de bord, onglet « Mon inscription ».`,
          link: "/certificate",
          readBy: [],
          createdAt: new Date(),
        })
        .catch(() => {});
      return NextResponse.json({ ok: true, number });
    }

    if (action === "revoke") {
      await c.registrations.updateOne({ _id }, { $set: { certificate: null } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
