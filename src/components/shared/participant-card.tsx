"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { useCampInfo } from "@/components/shared/camp-info";
import { Button } from "@/components/ui/button";
import StoryCardButton from "@/components/shared/story-card";
import ExchangeCardButton from "@/components/shared/exchange-card";
import { toast } from "@/hooks/use-toast";
import { Download, Loader2, IdCard } from "lucide-react";

/* ============================================================
 * Digital participant card + QR code
 * - Rendered with INLINE HEX STYLES ONLY (no Tailwind/oklch) so the
 *   PNG download via html2canvas-pro is pixel-perfect.
 * - QR encodes the pure booking code "HIEX-XXXXXX" — scanned in one
 *   shot by the admin check-in scanner (older cards encoding
 *   "CODE • NAME" remain fully supported by the shared parser).
 * ============================================================ */

interface ParticipantCardProps {
  fullName: string;
  accountType: "student" | "specialist";
  gender: "male" | "female";
  code: string;
  status: "pending" | "confirmed";
  attended?: boolean;
}

const TEAL = "#147A6F";
const TEAL_DARK = "#0B3B36";
const CREAM = "#F8F4EC";
const RED = "#D21034";

export default function ParticipantCard({
  fullName,
  accountType,
  gender,
  code,
  status,
  attended,
}: ParticipantCardProps) {
  const { t, lang } = useLang();
  const camp = useCampInfo();
  const cardRef = useRef<HTMLDivElement>(null);
  const [qr, setQr] = useState<string>("");
  const [campMeta, setCampMeta] = useState<{
    nameEn: string;
    edition: number;
    locationAr: string;
    locationFr: string;
    startDate: string;
    endDate: string;
  } | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/camp", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const s = d?.settings;
        if (s) {
          setCampMeta({
            nameEn: s.nameEn || "Happy inside expérience",
            edition: s.edition || 1,
            locationAr: s.locationAr || "",
            locationFr: s.locationFr || "",
            startDate: s.startDate || "",
            endDate: s.endDate || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(code, {
          margin: 1,
          width: 280,
          errorCorrectionLevel: "M",
          color: { dark: TEAL_DARK, light: "#FFFFFF" },
        })
      )
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [code]);

  const isAr = lang === "ar";
  const typeLabel = accountType === "student"
    ? isAr ? (gender === "female" ? "طالبة" : "طالب") : gender === "female" ? "Étudiante" : "Étudiant"
    : isAr ? (gender === "female" ? "أخصائية" : "أخصائي") : gender === "female" ? "Psychologue" : "Psychologue";

  const dateFmt = (iso: string) =>
    iso
      ? new Date(iso).toLocaleDateString(isAr ? "ar-DZ" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : "";

  const dates =
    campMeta?.startDate && campMeta?.endDate
      ? isAr
        ? `${dateFmt(campMeta.startDate)} — ${dateFmt(campMeta.endDate)}`
        : `Du ${dateFmt(campMeta.startDate)} au ${dateFmt(campMeta.endDate)}`
      : "";

  const downloadPng = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(cardRef.current, {
        scale: 2.5,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${code || "hiex"}-card.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: t.common.success, description: t.dash.cardDownloaded });
      }, "image/png");
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const logoSrc = camp.logo || "/images/logo.png";

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={cardRef} style={{ width: "100%", maxWidth: 400 }}>
        <div
          dir={isAr ? "rtl" : "ltr"}
          style={{
            position: "relative",
            borderRadius: 22,
            overflow: "hidden",
            background: "#FFFFFF",
            border: `1px solid ${TEAL}33`,
            boxShadow: "0 18px 44px -18px rgba(11,59,54,0.35)",
            fontFamily: isAr ? '"Cairo Variable", Cairo, Tahoma, sans-serif' : '"Outfit Variable", Outfit, sans-serif',
          }}
        >
          {/* Header band */}
          <div
            style={{
              background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`,
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#FFFFFF",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
                padding: 4,
              }}
            >
              { }
              <img src={logoSrc} alt="Happy inside expérience" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, lineHeight: 1.2, letterSpacing: 0.2 }}>
                {campMeta?.nameEn || "Happy inside expérience"}
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 10.5, opacity: 0.85, fontWeight: 600 }}>
                {isAr ? `الطبعة ${campMeta?.edition ?? 1} — ${dates}` : `Édition ${campMeta?.edition ?? 1} — ${dates}`}
              </p>
            </div>
          </div>

          {/* Status strip */}
          <div
            style={{
              height: 4,
              background: attended ? "#16A34A" : status === "confirmed" ? TEAL : "#F59E0B",
            }}
          />

          {/* Body */}
          <div style={{ padding: "16px 18px", background: CREAM }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: `${TEAL_DARK}99`, textTransform: "uppercase", letterSpacing: 1 }}>
                  {t.dash.cardParticipant}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 17,
                    fontWeight: 800,
                    color: TEAL_DARK,
                    lineHeight: 1.3,
                    overflowWrap: "anywhere",
                  }}
                >
                  {fullName}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: accountType === "student" ? `${TEAL}1A` : `${RED}14`,
                      color: accountType === "student" ? TEAL : RED,
                      border: `1px solid ${accountType === "student" ? `${TEAL}55` : `${RED}44`}`,
                    }}
                  >
                    {accountType === "student" ? "🎓" : "💼"} {typeLabel}
                  </span>
                  {attended ? (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: "#16A34A1A",
                        color: "#15803D",
                        border: "1px solid #16A34A55",
                      }}
                    >
                      ✓ {t.dash.cardAttended}
                    </span>
                  ) : null}
                </div>
              </div>
              {/* QR */}
              <div
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${TEAL}33`,
                  borderRadius: 14,
                  padding: 7,
                  flexShrink: 0,
                  textAlign: "center",
                }}
              >
                {qr ? (
                   
                  <img src={qr} alt={`QR ${code}`} width={96} height={96} style={{ display: "block", borderRadius: 6 }} />
                ) : (
                  <div style={{ width: 96, height: 96 }} />
                )}
                <p style={{ margin: "5px 0 0", fontSize: 8, fontWeight: 700, color: `${TEAL_DARK}AA` }}>
                  {t.dash.cardScanHint}
                </p>
              </div>
            </div>

            {/* Code row */}
            <div
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                background: "#FFFFFF",
                border: `1px dashed ${TEAL}55`,
                borderRadius: 12,
                padding: "9px 14px",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: `${TEAL_DARK}99` }}>
                {t.dash.cardCode}
              </span>
              <span
                dir="ltr"
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  letterSpacing: 3,
                  color: TEAL,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                {code}
              </span>
            </div>

            {/* Location footer */}
            {campMeta ? (
              <p style={{ margin: "10px 0 0", fontSize: 10, fontWeight: 600, color: `${TEAL_DARK}88`, textAlign: "center" }}>
                📍 {isAr ? campMeta.locationAr : campMeta.locationFr}
              </p>
            ) : null}
          </div>

          {/* Pending watermark */}
          {status === "pending" ? (
            <>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(245, 158, 11, 0.06)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  transform: "translateY(-50%) rotate(-14deg)",
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 26,
                    fontWeight: 800,
                    color: "rgba(217, 119, 6, 0.30)",
                    border: "3px solid rgba(217, 119, 6, 0.30)",
                    borderRadius: 12,
                    padding: "6px 22px",
                    background: "rgba(255,255,255,0.55)",
                  }}
                >
                  {t.dash.cardPendingWatermark}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          onClick={downloadPng}
          disabled={downloading}
          variant="outline"
          className="h-10 rounded-xl font-extrabold"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t.dash.cardDownload}
        </Button>
        {/* Shareable Instagram story card (9:16) — Task 18 */}
        <StoryCardButton
          fullName={fullName}
          accountType={accountType}
          gender={gender}
          code={code}
          status={status}
        />
        {/* QR networking card — Task 20 */}
        <ExchangeCardButton code={code} fullName={fullName} accountType={accountType} />
        <span className="flex w-full items-center justify-center gap-1.5 text-[11px] font-bold text-muted-foreground sm:w-auto">
          <IdCard className="h-3.5 w-3.5" />
          {status === "pending" ? t.dash.cardPendingNote : t.dash.cardPresentNote}
        </span>
      </div>
    </div>
  );
}
