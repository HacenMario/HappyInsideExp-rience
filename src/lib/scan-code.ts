/**
 * Client-safe booking-code utilities (NO server imports — bundled in the browser).
 * Shared by the admin check-in scanner, the manual input and the API route.
 */

/**
 * Normalize ANY scanned/typed value into a clean booking code.
 * Handles every real-world input shape:
 *  - "HIEX-AB12CD"                    (typed / card QR v2)
 *  - "HIEX-AB12CD • FULL NAME"        (card QR v1 — old downloaded cards)
 *  - "AB12CD"                         (bare suffix)
 *  - "hiex ab12cd" / "HIEX:AB12CD"    (sloppy typing / other scanners)
 * Returns "" for empty input; never throws.
 */
export function normalizeScannedCode(raw: string): string {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "";

  // 1) Explicit HIEX code anywhere in the string (first occurrence wins).
  const full = s.match(/HIEX\s*[-–—:_ ]?\s*([A-Z0-9]{6})/);
  if (full) return `HIEX-${full[1]}`;

  // 2) First segment before common separators ("•", "|", "/") that
  //    looks like a bare 6-character suffix.
  const seg = s.split(/[•|/]/)[0].trim().replace(/\s+/g, "");
  const bare = seg.match(/^(?:HIEX)?[-–—:_]?([A-Z0-9]{6})$/);
  if (bare) return `HIEX-${bare[1]}`;

  // 3) Fallback: keep the whitespace-stripped value (the API lookup will
  //    simply miss → "invalid_code", which is the correct outcome).
  return s.replace(/\s+/g, "");
}
