import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections, type CampRegistrationDoc } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { ensureBookingCode } from "@/lib/booking-code";

export const dynamic = "force-dynamic";

/* Certificate data for the certificate page /certificate.
 * - Without params: the session user's OWN issued certificate (participants).
 * - With ?code=HIEX-XXXX: admin preview of any issued certificate.
 * A certificate that the admin has not issued NEVER exists here — the
 * feature is invisible to everyone else. */

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const c = await collections();

    const { searchParams } = new URL(req.url);
    const codeParam = (searchParams.get("code") || "").trim().toUpperCase();

    let reg: CampRegistrationDoc | null = null;
    if (codeParam) {
      // Admin preview path
      const me = await c.users.findOne({ _id: safeObjectId(session.uid) });
      if (!me || me.role !== "admin") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      const normalized = codeParam.startsWith("HIEX-") ? codeParam : `HIEX-${codeParam}`;
      reg = await c.registrations.findOne({ code: normalized });
    } else {
      reg = await c.registrations.findOne({
        userId: session.uid,
        status: { $in: ["confirmed"] },
      });
      if (reg) await ensureBookingCode(reg);
    }

    if (!reg || !reg.certificate?.issued) {
      return NextResponse.json({ error: "no_certificate" }, { status: 404 });
    }

    const settings = await c.settings.findOne({ key: "main" });

    return NextResponse.json({
      certificate: {
        number: reg.certificate.number,
        issuedAt: reg.certificate.issuedAt,
      },
      participant: {
        fullName: reg.userFullName,
        accountType: reg.accountType || "specialist",
        wilaya: "",
        code: reg.code || "",
      },
      camp: settings
        ? {
            nameEn: settings.nameEn,
            edition: settings.edition,
            locationAr: settings.locationAr,
            locationFr: settings.locationFr,
            startDate: settings.startDate,
            endDate: settings.endDate,
            logo: settings.logo || null,
          }
        : null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

function safeObjectId(uid: string): ObjectId {
  try {
    return new ObjectId(uid);
  } catch {
    return new ObjectId();
  }
}
