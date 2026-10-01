"use client";

import React, { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { LogoSkeleton } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2, Award, ShieldCheck, ArrowRight, Printer } from "lucide-react";

/* ============================================================
 * Attendance certificate page — /certificate
 * - Participants: only their OWN certificate, and ONLY after the
 *   admin issued it (API returns 404 otherwise → feature invisible).
 * - Admin: /certificate?code=HIEX-XXXXXX previews any issued certificate.
 *
 * Rendering architecture (RTL-safe + print-safe + PDF-perfect):
 *  1. ON-SCREEN PREVIEW  — the fixed A4 sheet (1123×794px) is scaled with
 *     transform and absolutely anchored at the PHYSICAL top-left of an
 *     explicitly-sized box, so RTL block flow can never shift/clip it.
 *  2. PRISTINE MASTER    — a second, untouched full-size copy is portaled
 *     to document.body (fixed, off-viewport). The PDF is rendered from
 *     THIS node (no transforms, no ancestor scaling) after briefly moving
 *     it behind a full-screen overlay — deterministic, pixel-perfect A4.
 *  3. PRINTING           — @page A4 landscape, everything except the
 *     pristine master is display:none, master scales 99.65% to fit the
 *     page box exactly. Ctrl+P / the print button give a real A4 print.
 * ============================================================ */

interface CertData {
  certificate: { number: string; issuedAt: string };
  participant: { fullName: string; accountType: "student" | "specialist"; code: string };
  camp: {
    nameEn: string;
    edition: number;
    locationAr: string;
    locationFr: string;
    startDate: string;
    endDate: string;
    logo: string | null;
  } | null;
}

const TEAL = "#147A6F";
const TEAL_DARK = "#0B3B36";
const RED = "#D21034";
const GOLD = "#B8860B";

/* A4 landscape @96dpi */
const CERT_W = 1123;
const CERT_H = 794;

const PRINT_CSS = `
@media print {
  @page { size: A4 landscape; margin: 0; }
  html, body { background: #ffffff !important; }
  body > *:not(.cert-print-root) { display: none !important; }
  .cert-print-root { position: static !important; left: auto !important; top: auto !important; }
  .cert-print-root > div { transform: scale(0.9965) !important; transform-origin: top left !important; }
}`;

function fmtDate(iso: string | undefined, lang: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function CertificateInner() {
  const { t, lang } = useLang();
  const searchParams = useSearchParams();
  const codeParam = searchParams?.get("code") || "";

  const [data, setData] = useState<CertData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none" | "error">("loading");
  const [downloading, setDownloading] = useState(false);
  const [scale, setScale] = useState(1);
  const [qr, setQr] = useState("");
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pristineRef = useRef<HTMLDivElement>(null);

  const isAr = lang === "ar";

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const url = codeParam ? `/api/certificate?code=${encodeURIComponent(codeParam)}` : "/api/certificate";
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404) {
          setState("none");
          return null;
        }
        if (!r.ok) {
          setState("error");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setData(d);
          setState("ready");
        }
      })
      .catch(() => setState("error"));
  }, [codeParam]);

  /* Small verification QR with the certificate number */
  useEffect(() => {
    if (state !== "ready" || !data) return;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(`HIEX-VERIFY • ${data.certificate.number}`, {
          margin: 0,
          width: 220,
          color: { dark: TEAL_DARK, light: "#FFFFFF" },
        })
      )
      .then(setQr)
      .catch(() => {});
  }, [state, data]);

  /* Responsive scaling of the fixed-size A4 sheet (measured BEFORE paint) */
  useLayoutEffect(() => {
    if (state !== "ready") return;
    const update = () => {
      if (wrapRef.current) {
        setScale(Math.min(1, wrapRef.current.clientWidth / CERT_W));
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [state]);

  /*
   * PDF export — rendered from the PRISTINE full-size master.
   * The master normally lives off-viewport (fixed, left:-20000px). For the
   * capture we slide it to the viewport origin BEHIND a full-screen white
   * overlay (so nothing flashes), render it with html2canvas-pro at 2.5×,
   * then slide it back. Zero transforms, zero RTL ambiguity, exact A4.
   */
  const downloadPdf = useCallback(async () => {
    const node = pristineRef.current;
    if (!node || !data || downloading) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      (node.parentElement as HTMLElement).style.left = "0px";
      // let the overlay paint before the sheet becomes "visible" behind it
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = await html2canvas(node, {
        scale: 2.5,
        backgroundColor: "#FFFFFF",
        useCORS: true,
        logging: false,
      });
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 297, 210, undefined, "FAST");
      pdf.save(`${data.certificate.number || "certificate"}.pdf`);
      toast({ title: t.common.success, description: t.cert.downloaded });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      const parent = pristineRef.current?.parentElement;
      if (parent) parent.style.left = "-20000px";
      setDownloading(false);
    }
  }, [data, downloading, t]);

  if (state === "loading") {
    return <LogoSkeleton label={t.common.loading} />;
  }

  if (state !== "ready" || !data) {
    return (
      <div className="relative min-h-[70vh] py-10">
        <div className="hero-mesh absolute inset-0 -z-10 opacity-40" />
        <div className="mx-auto max-w-md px-4">
          <Card className="card-glow border-0 p-0">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Award className="h-10 w-10 opacity-50" />
              </div>
              <h1 className="text-xl font-black">{t.cert.noneTitle}</h1>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">{t.cert.noneDesc}</p>
              <Link href="/dashboard?tab=registration">
                <Button variant="outline" className="mt-6 rounded-xl font-bold">
                  <ArrowRight className="h-4 w-4" />
                  {t.nav.dashboard}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const camp = data.camp;
  const location = isAr ? camp?.locationAr : camp?.locationFr;
  const dateStr =
    camp?.startDate && camp?.endDate
      ? isAr
        ? `${fmtDate(camp.startDate, "ar")} — ${fmtDate(camp.endDate, "ar")}`
        : `Du ${fmtDate(camp.startDate, "fr")} au ${fmtDate(camp.endDate, "fr")}`
      : "";
  const typeLabel =
    data.participant.accountType === "student"
      ? isAr
        ? "طالب/طالبة"
        : "Étudiant(e)"
      : isAr
        ? "أخصائي/أخصائية"
        : "Psychologue";

  const sheetProps = {
    lang,
    data,
    location: location || "",
    dateStr,
    typeLabel,
    logo: camp?.logo || null,
    qr,
  };

  return (
    <div className="relative min-h-[70vh] py-10">
      {/* Print rules — only meaningful while a certificate is on screen */}
      <style>{PRINT_CSS}</style>

      <div className="hero-mesh absolute inset-0 -z-10 opacity-40" />
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        {/* Toolbar */}
        <div className="mb-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-black sm:text-xl">
              <Award className="h-5 w-5 text-amber-500" />
              {t.cert.title}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">
              {data.certificate.number}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={downloadPdf}
              disabled={downloading}
              className="h-11 rounded-xl bg-amber-500 font-extrabold text-white shadow-lg shadow-amber-500/30 hover:bg-amber-500/90"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t.cert.downloadBtn}
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="h-11 rounded-xl font-extrabold"
            >
              <Printer className="h-4 w-4" />
              {t.cert.printBtn}
            </Button>
            <Link href="/dashboard?tab=registration">
              <Button variant="outline" className="h-11 rounded-xl font-bold">
                <ArrowRight className="h-4 w-4" />
                {t.common.back}
              </Button>
            </Link>
          </div>
        </div>

        {/* ===== On-screen preview: A4 sheet scaled to the available width ===== */}
        <div ref={wrapRef} className="w-full">
          <div
            className="relative mx-auto overflow-hidden rounded-xl shadow-2xl"
            style={{ width: Math.round(CERT_W * scale), height: Math.round(CERT_H * scale) }}
          >
            {/* Physical top-left anchor — immune to RTL block flow */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: CERT_W,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <div dir={isAr ? "rtl" : "ltr"}>
                <CertificateSheet {...sheetProps} />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] font-bold text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-2" />
          {t.cert.verifyNote} <span dir="ltr" className="font-mono">{data.certificate.number}</span>
        </p>
      </div>

      {/* ===== Pristine full-size master (PDF + print source) ===== */}
      {mounted
        ? createPortal(
            <div
              className="cert-print-root"
              style={{ position: "fixed", top: 0, left: "-20000px", zIndex: -1, pointerEvents: "none" }}
            >
              <div dir={isAr ? "rtl" : "ltr"} ref={pristineRef}>
                <CertificateSheet {...sheetProps} />
              </div>
            </div>,
            document.body
          )
        : null}

      {/* ===== PDF generation overlay (also hides the capture moment) ===== */}
      {downloading ? (
        <div
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-3 bg-background/95"
          dir={isAr ? "rtl" : "ltr"}
        >
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm font-black">{t.cert.generating}</p>
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================
 * The A4 sheet itself — 1123×794 px, absolute layout, inline
 * styles only (html2canvas-pro / print fidelity).
 * ============================================================ */
function CertificateSheet({
  lang,
  data,
  location,
  dateStr,
  typeLabel,
  logo,
  qr,
}: {
  lang: "ar" | "fr";
  data: CertData;
  location: string;
  dateStr: string;
  typeLabel: string;
  logo: string | null;
  qr: string;
}) {
  const isAr = lang === "ar";
  const font = isAr ? '"Cairo Variable", Cairo, Tahoma, sans-serif' : '"Outfit Variable", Outfit, sans-serif';

  /* Adaptive name size — long names shrink instead of colliding */
  const nameLen = data.participant.fullName.length;
  const nameSize = nameLen > 34 ? 32 : nameLen > 26 ? 37 : nameLen > 18 ? 42 : 46;

  /* Corner ornament (double L) */
  const corner = (pos: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    width: 56,
    height: 56,
    ...pos,
  });

  return (
    <div
      style={{
        width: CERT_W,
        height: CERT_H,
        position: "relative",
        background: "#FFFFFF",
        fontFamily: font,
        overflow: "hidden",
        color: TEAL_DARK,
      }}
    >
      {/* Double frame */}
      <div style={{ position: "absolute", inset: 20, border: `3px solid ${TEAL}`, borderRadius: 20 }} />
      <div style={{ position: "absolute", inset: 32, border: `1.5px solid ${GOLD}77`, borderRadius: 13 }} />

      {/* Corner ornaments */}
      <div style={corner({ top: 44, left: 44 })}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 56, height: 3, background: TEAL, borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: 56, background: TEAL, borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 8, left: 8, width: 34, height: 2, background: `${GOLD}AA`, borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 8, left: 8, width: 2, height: 34, background: `${GOLD}AA`, borderRadius: 2 }} />
      </div>
      <div style={corner({ top: 44, right: 44 })}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 56, height: 3, background: TEAL, borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 3, height: 56, background: TEAL, borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 8, right: 8, width: 34, height: 2, background: `${GOLD}AA`, borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 8, right: 8, width: 2, height: 34, background: `${GOLD}AA`, borderRadius: 2 }} />
      </div>
      <div style={corner({ bottom: 44, left: 44 })}>
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 56, height: 3, background: TEAL, borderRadius: 2 }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 3, height: 56, background: TEAL, borderRadius: 2 }} />
        <div style={{ position: "absolute", bottom: 8, left: 8, width: 34, height: 2, background: `${GOLD}AA`, borderRadius: 2 }} />
        <div style={{ position: "absolute", bottom: 8, left: 8, width: 2, height: 34, background: `${GOLD}AA`, borderRadius: 2 }} />
      </div>
      <div style={corner({ bottom: 44, right: 44 })}>
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 56, height: 3, background: TEAL, borderRadius: 2 }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 3, height: 56, background: TEAL, borderRadius: 2 }} />
        <div style={{ position: "absolute", bottom: 8, right: 8, width: 34, height: 2, background: `${GOLD}AA`, borderRadius: 2 }} />
        <div style={{ position: "absolute", bottom: 8, right: 8, width: 2, height: 34, background: `${GOLD}AA`, borderRadius: 2 }} />
      </div>

      {/* Soft background emblems */}
      <div style={{ position: "absolute", bottom: -70, left: -70, width: 280, height: 280, borderRadius: "50%", background: `${TEAL}08` }} />
      <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: `${GOLD}0D` }} />

      {/* Header: logo + camp identity */}
      <div
        style={{
          position: "absolute",
          top: 62,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            width: 86,
            height: 86,
            borderRadius: 20,
            background: "#FFFFFF",
            border: `2px solid ${TEAL}33`,
            boxShadow: "0 6px 18px -8px rgba(11,59,54,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            padding: 6,
            flexShrink: 0,
          }}
        >
          <img src={logo || "/images/logo.png"} alt="Happy inside expérience" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div style={{ textAlign: isAr ? "right" : "left" }}>
          <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: TEAL, lineHeight: 1.15 }}>
            {data.camp?.nameEn || "Happy inside expérience"}
          </p>
          <p style={{ margin: "5px 0 0", fontSize: 14.5, fontWeight: 700, color: `${TEAL_DARK}AA` }}>
            {isAr
              ? `مخيّم الأخصائيين النفسيين في الجزائر — الطبعة ${data.camp?.edition ?? 1}`
              : `Camp des psychologues d'Algérie — Édition ${data.camp?.edition ?? 1}`}
          </p>
        </div>
      </div>

      {/* Title block */}
      <div style={{ position: "absolute", top: 208, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ width: 80, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
          <p style={{ margin: 0, fontSize: 47, fontWeight: 800, color: TEAL_DARK, letterSpacing: isAr ? 0 : 1.5, lineHeight: 1.2 }}>
            {isAr ? "شهادة حضور" : "Certificat de présence"}
          </p>
          <div style={{ width: 80, height: 2, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 17, fontWeight: 600, color: `${TEAL_DARK}99` }}>
          {isAr ? "تشهد إدارة المخيم بأن" : "La direction du camp certifie que"}
        </p>
      </div>

      {/* Participant name */}
      <div style={{ position: "absolute", top: 336, left: 100, right: 100, textAlign: "center" }}>
        <p
          style={{
            margin: 0,
            display: "inline-block",
            fontSize: nameSize,
            fontWeight: 800,
            color: TEAL,
            paddingBottom: 10,
            borderBottom: `2.5px solid ${GOLD}88`,
            paddingInline: 36,
            lineHeight: 1.25,
            overflowWrap: "anywhere",
          }}
        >
          {data.participant.fullName}
        </p>
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: `${TEAL_DARK}CC`,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            {isAr ? "الفئة:" : "Catégorie :"}
            <span
              style={{
                fontSize: 14.5,
                fontWeight: 800,
                padding: "4px 14px",
                borderRadius: 999,
                background: data.participant.accountType === "student" ? `${TEAL}14` : `${RED}10`,
                color: data.participant.accountType === "student" ? TEAL : RED,
                border: `1.5px solid ${data.participant.accountType === "student" ? `${TEAL}55` : `${RED}44`}`,
              }}
            >
              {data.participant.accountType === "student" ? "🎓 " : "💼 "}
              {typeLabel}
            </span>
          </span>
          <span
            dir="ltr"
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: `${TEAL_DARK}88`,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              background: "#FFFFFF",
              border: `1px dashed ${TEAL}44`,
              borderRadius: 8,
              padding: "4px 10px",
            }}
          >
            {data.participant.code}
          </span>
        </div>
      </div>

      {/* Body text */}
      <div style={{ position: "absolute", top: 528, left: 130, right: 130, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 16.5, fontWeight: 600, lineHeight: 1.9, color: `${TEAL_DARK}DD` }}>
          {isAr
            ? `لقد شارك(ت) بفعالية في أنشطة الطبعة ${data.camp?.edition ?? 1} من مخيم ${data.camp?.nameEn || "Happy inside expérience"}`
            : `A participé(e) activement aux activités de l'édition ${data.camp?.edition ?? 1} du camp ${data.camp?.nameEn || "Happy inside expérience"}`}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 16, fontWeight: 700, color: TEAL_DARK }}>
          📍 {location}
          {dateStr ? (isAr ? ` • ${dateStr}` : ` • ${dateStr}`) : ""}
        </p>
      </div>

      {/* Footer: issued date • verification QR • signature */}
      <div
        style={{
          position: "absolute",
          bottom: 58,
          left: 96,
          right: 96,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div style={{ minWidth: 150 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: `${TEAL_DARK}77` }}>
            {isAr ? "صدرت في" : "Délivrée le"}
          </p>
          <p style={{ margin: "5px 0 0", fontSize: 14.5, fontWeight: 700, color: TEAL_DARK }}>
            {fmtDate(data.certificate.issuedAt, lang)}
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          {qr ? (
            <img src={qr} alt="verify" width={76} height={76} style={{ display: "block", margin: "0 auto" }} />
          ) : (
            <div style={{ width: 76, height: 76 }} />
          )}
          <p
            dir="ltr"
            style={{
              margin: "7px 0 0",
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: 1,
              color: `${TEAL_DARK}AA`,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            {data.certificate.number}
          </p>
        </div>
        <div style={{ textAlign: isAr ? "left" : "right", minWidth: 150 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: `${TEAL_DARK}77` }}>
            {isAr ? "إدارة المخيم" : "La direction du camp"}
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 21, fontWeight: 800, color: TEAL, fontStyle: "italic" }}>
            Happy inside expérience
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CertificatePage() {
  return (
    <Suspense fallback={<LogoSkeleton label="..." />}>
      <CertificateInner />
    </Suspense>
  );
}
