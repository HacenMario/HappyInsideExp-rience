import { randomInt } from "crypto";
import { ObjectId } from "mongodb";
import { collections, type CampRegistrationDoc } from "./mongodb";

/* Booking code used on the digital participant card + QR.
 * Format: HIEX-XXXXXX (6 unambiguous characters, no 0/O/1/I/L). */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

// Server-side re-export of the shared, client-safe code parser.
export { normalizeScannedCode } from "./scan-code";

export function generateBookingCode(): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `HIEX-${suffix}`;
}

/** Certificate number: HIEX-CERT-2026-0001 (monotonic over issued certs). */
export async function nextCertificateNumber(): Promise<string> {
  const c = await collections();
  const year = new Date().getFullYear();
  const prefix = `HIEX-CERT-${year}-`;
  let maxSeq = 0;
  const issued = await c.registrations
    .find({ "certificate.issued": true, "certificate.number": { $exists: true } })
    .project<{ certificate?: { number: string } }>({ "certificate.number": 1 })
    .toArray();
  for (const doc of issued) {
    const num = doc.certificate?.number || "";
    if (num.startsWith(prefix)) {
      const seq = parseInt(num.slice(prefix.length), 10);
      if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

/* Backfill helper: older registrations were created before codes existed.
 * Called lazily whenever a registration is read, so the deployment needs no
 * migration script — the first read gives every booking its permanent code. */
export async function ensureBookingCode(reg: CampRegistrationDoc): Promise<string> {
  if (reg.code) return reg.code;
  const c = await collections();
  const regId = reg._id as ObjectId;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateBookingCode();
    const clash = await c.registrations.findOne({ code, _id: { $ne: regId } });
    if (clash) continue;
    await c.registrations.updateOne({ _id: regId }, { $set: { code } });
    reg.code = code;
    return code;
  }
  // Astronomically unlikely (5 collisions) — still return a usable code.
  const fallback = generateBookingCode();
  await c.registrations.updateOne({ _id: regId }, { $set: { code: fallback } });
  reg.code = fallback;
  return fallback;
}
