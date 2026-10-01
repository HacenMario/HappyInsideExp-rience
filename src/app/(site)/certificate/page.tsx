"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { LogoSkeleton } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2, Award, ShieldCheck, ArrowRight } from "lucide-react";

/* ============================================================
 * Attendance certificate page — /certificate
 * - Participants: only their OWN certificate, and ONLY after the
 *   admin issued it (API returns 404 otherwise → feature invisible).
 * - Admin: /certificate?code=HIEX-XXXXXX previews any issued certificate.
 * - "تحميل PDF" renders the A4 landscape certificate (1123×794 px)
 *   through html2canvas-pro and packs it into a jsPDF A4 page.
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
const CREAM = "#F8F4EC";
const GOLD = "#B8860B";

/* A4 landscape @96dpi */
const CERT_W = 1123;
const CERT_H = 794;

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const certRef = useRef<HTMLDivElement>(null);

  const isAr = lang === "ar";

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

  /* Responsive scaling of the fixed-size A4 sheet */
  useEffect(() => {
    const update = () => {
      if (wrapRef.current) {
        setScale(Math.min(1, wrapRef.current.clientWidth / CERT_W));
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [state]);

  const downloadPdf = useCallback(async () => {
    if (!certRef.current || !data || downloading) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: "#FFFFFF",
        useCORS: true,
        logging: false,
        width: CERT_W,
        height: CERT_H,
        windowWidth: CERT_W,
        windowHeight: CERT_H,
      });
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      pdf.addImage(canvas.toDataURL("image/png", 0.96), "PNG", 0, 0, 297, 210);
      pdf.save(`${data.certificate.number || "certificate"}.pdf`);
      toast({ title: t.common.success, description: t.cert.downloaded });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
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

  return (
    <div className="relative min-h-[70vh] py-10">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-40" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
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
          <div className="flex items-center gap-2">
            <Button
              onClick={downloadPdf}
              disabled={downloading}
              className="h-11 rounded-xl bg-amber-500 font-extrabold text-white shadow-lg shadow-amber-500/30 hover:bg-amber-500/90"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t.cert.downloadBtn}
            </Button>
            <Link href="/dashboard?tab=registration">
              <Button variant="outline" className="h-11 rounded-xl font-bold">
                <ArrowRight className="h-4 w-4" />
                {t.common.back}
              </Button>
            </Link>
          </div>
        </div>

        {/* Scaled A4 sheet */}
        <div ref={wrapRef} className="overflow-hidden rounded-xl shadow-2xl">
          <div
            style={{
              height: CERT_H * scale,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: CERT_W,
              }}
            >
              <div ref={certRef} dir={isAr ? "rtl" : "ltr"}>
                <CertificateSheet
                  lang={lang}
                  data={data}
                  location={location || ""}
                  dateStr={dateStr}
                  typeLabel={typeLabel}
                  logo={camp?.logo || null}
                  qr={qr}
                />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] font-bold text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-2" />
          {t.cert.verifyNote} <span dir="ltr" className="font-mono">{data.certificate.number}</span>
        </p>
      </div>
    </div>
  );
}

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
      {/* Outer frame */}
      <div
        style={{
          position: "absolute",
          inset: 22,
          border: `3px solid ${TEAL}`,
          borderRadius: 18,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 34,
          border: `1px solid ${GOLD}66`,
          borderRadius: 12,
        }}
      />

      {/* Corner accents */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 52,
          width: 46,
          height: 6,
          borderRadius: 3,
          background: `linear-gradient(90deg, ${GOLD}, transparent)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 52,
          width: 46,
          height: 6,
          borderRadius: 3,
          background: `linear-gradient(270deg, ${GOLD}, transparent)`,
        }}
      />

      {/* Header: logo + camp name */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
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
          { }
          <img src={logo || "/images/logo.png"} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div style={{ textAlign: isAr ? "right" : "left" }}>
          <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: TEAL, lineHeight: 1.15 }}>
            {data.camp?.nameEn || "Happy inside expérience"}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: `${TEAL_DARK}AA` }}>
            {isAr
              ? `مخيّم الأخصائيين النفسيين في الجزائر — الطبعة ${data.camp?.edition ?? 1}`
              : `Camp des psychologues d'Algérie — Édition ${data.camp?.edition ?? 1}`}
          </p>
        </div>
      </div>

      {/* Title */}
      <div style={{ position: "absolute", top: 205, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ width: 70, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
          <p
            style={{
              margin: 0,
              fontSize: 46,
              fontWeight: 800,
              color: TEAL_DARK,
              letterSpacing: isAr ? 0 : 1.5,
            }}
          >
            {isAr ? "شهادة حضور" : "Certificat de présence"}
          </p>
          <div style={{ width: 70, height: 2, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 16, fontWeight: 600, color: `${TEAL_DARK}99` }}>
          {isAr ? "تشهد إدارة المخيم بأن" : "La direction du camp certifie que"}
        </p>
      </div>

      {/* Participant name */}
      <div style={{ position: "absolute", top: 330, left: 0, right: 0, textAlign: "center" }}>
        <p
          style={{
            margin: 0,
            display: "inline-block",
            fontSize: 44,
            fontWeight: 800,
            color: TEAL,
            paddingBottom: 8,
            borderBottom: `2px solid ${GOLD}88`,
            paddingInline: 40,
            overflowWrap: "anywhere",
          }}
        >
          {data.participant.fullName}
        </p>
        <p style={{ margin: "16px 0 0", fontSize: 16, fontWeight: 700, color: `${TEAL_DARK}CC` }}>
          {isAr ? "الفئة: " : "Catégorie : "}
          <span style={{ color: data.participant.accountType === "student" ? TEAL : RED }}>{typeLabel}</span>
        </p>
      </div>

      {/* Body text */}
      <div style={{ position: "absolute", top: 480, left: 120, right: 120, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, lineHeight: 1.9, color: `${TEAL_DARK}DD` }}>
          {isAr
            ? `لقد شارك(bت) بفعالية في أنشطة الطبعة ${data.camp?.edition ?? 1} من مخيم ${data.camp?.nameEn || "Happy inside expérience"}`
            : `A participé(e) activement aux activités de l'édition ${data.camp?.edition ?? 1} du camp ${data.camp?.nameEn || "Happy inside expérience"}`}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 15.5, fontWeight: 600, color: `${TEAL_DARK}CC` }}>
          📍 {location} {dateStr ? `• ${dateStr}` : ""}
        </p>
      </div>

      {/* Footer: date issued + verification QR + number */}
      <div
        style={{
          position: "absolute",
          bottom: 64,
          left: 90,
          right: 90,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: `${TEAL_DARK}77` }}>
            {isAr ? "صدرت في" : "Délivrée le"}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: TEAL_DARK }}>
            {fmtDate(data.certificate.issuedAt, lang)}
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          {qr ? (
             
            <img src={qr} alt="verify" width={74} height={74} style={{ display: "block", margin: "0 auto" }} />
          ) : (
            <div style={{ width: 74, height: 74 }} />
          )}
          <p
            dir="ltr"
            style={{
              margin: "6px 0 0",
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
        <div style={{ textAlign: isAr ? "left" : "right" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: `${TEAL_DARK}77` }}>
            {isAr ? "إدارة المخيم" : "La direction du camp"}
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 20, fontWeight: 800, color: TEAL, fontStyle: "italic" }}>
            Happy inside expérience
          </p>
        </div>
      </div>

      {/* Subtle background emblem */}
      <div
        style={{
          position: "absolute",
          bottom: -60,
          left: -60,
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `${TEAL}08`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `${GOLD}0D`,
        }}
      />
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
