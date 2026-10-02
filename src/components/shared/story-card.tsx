"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { useCampInfo } from "@/components/shared/camp-info";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Download, Share2, Loader2, Instagram, Sparkles } from "lucide-react";

/* ============================================================
 * SHAREABLE INSTAGRAM STORY CARD (9:16 — 1080×1920) — Task 18
 * Every participant becomes a marketer: a beautiful story-ready
 * PNG with their first name, seat number, camp dates, location
 * and a QR code that opens the site.
 * - Live preview scaled inside a Dialog (RTL-immune: explicit
 *   container + physical top/left origin, same pattern as the
 *   A4 certificate).
 * - PNG capture uses a PRISTINE off-screen copy (zero transforms)
 *   at scale 1 → exactly 1080×1920.
 * - "Share" uses the native share sheet when the browser allows
 *   sharing files (great on Android/WhatsApp/Instagram).
 * ============================================================ */

const TEAL = "#147A6F";
const TEAL_DARK = "#0B3B36";
const GOLD = "#E7B84C";
const CREAM = "#F8F4EC";

interface StoryMeta {
  nameEn: string;
  edition: number;
  locationAr: string;
  locationFr: string;
  startDate: string;
  endDate: string;
}

interface StoryData {
  fullName: string;
  accountType: "student" | "specialist";
  gender: "male" | "female";
  code: string;
  status: "pending" | "confirmed";
}

const STORY_W = 1080;
const STORY_H = 1920;
const PREVIEW_SCALE = 0.26;

function firstName(full: string): string {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  return parts[0] || "";
}

export default function StoryCardButton(props: StoryData) {
  const { t, lang } = useLang();
  const camp = useCampInfo();
  const isAr = lang === "ar";

  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<StoryMeta | null>(null);
  const [qr, setQr] = useState("");
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [seatNumber, setSeatNumber] = useState<number | null>(null);
  const pristineRef = useRef<HTMLDivElement>(null);

  /* chronological seat number for the "المشارك رقم N" badge */
  useEffect(() => {
    if (!open) return;
    fetch("/api/registration", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.registration?.seatNumber === "number") {
          setSeatNumber(d.registration.seatNumber);
        }
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/camp", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const s = d?.settings;
        if (s) {
          setMeta({
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
    if (!open || !origin) return;
    let alive = true;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(origin, {
          margin: 1,
          width: 460,
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
  }, [open, origin]);

  useEffect(() => {
    if (!open) return;
    try {
      setCanShare(typeof navigator !== "undefined" && typeof navigator.canShare === "function");
    } catch {
      setCanShare(false);
    }
  }, [open]);

  const typeLabel =
    props.accountType === "student"
      ? isAr
        ? props.gender === "female"
          ? "طالبة"
          : "طالب"
        : props.gender === "female"
          ? "Étudiante"
          : "Étudiant"
      : isAr
        ? props.gender === "female"
          ? "أخصائية"
          : "أخصائي"
        : "Psychologue";

  const dateFmt = (iso: string) =>
    iso
      ? new Date(iso).toLocaleDateString(isAr ? "ar-DZ" : "fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

  const dates =
    meta?.startDate && meta?.endDate
      ? isAr
        ? `${dateFmt(meta.startDate)} — ${dateFmt(meta.endDate)}`
        : `Du ${dateFmt(meta.startDate)} au ${dateFmt(meta.endDate)}`
      : "";

  const logoSrc = camp.logo || "/images/logo.png";
  const fname = firstName(props.fullName) || (isAr ? "صديقي" : "Ami(e)");

  const capture = async (): Promise<Blob | null> => {
    if (!pristineRef.current) return null;
    const { default: html2canvas } = await import("html2canvas-pro");
    const canvas = await html2canvas(pristineRef.current, {
      scale: 1,
      backgroundColor: TEAL_DARK,
      useCORS: true,
      logging: false,
      width: STORY_W,
      height: STORY_H,
      windowWidth: STORY_W,
      windowHeight: STORY_H,
    });
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  };

  const downloadPng = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await capture();
      if (!blob) throw new Error("capture_failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hiex-story-${props.code || "camp"}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t.common.success, description: t.story.downloaded });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const sharePng = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await capture();
      if (!blob) throw new Error("capture_failed");
      const file = new File([blob], "hiex-story.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Happy inside expérience",
          text: isAr ? t.story.shareText : t.story.shareText,
        });
        toast({ title: t.common.success, description: t.story.shared });
      } else {
        await downloadPng();
      }
    } catch (e) {
      // user cancelled the share sheet — not an error
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  /* ---------- the card (shared markup for preview + pristine) ---------- */
  const renderCard = () => (
    <div
      dir={isAr ? "rtl" : "ltr"}
      style={{
        width: STORY_W,
        height: STORY_H,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(165deg, ${TEAL_DARK} 0%, ${TEAL} 52%, #1B9E85 100%)`,
        fontFamily: isAr ? '"Cairo Variable", Cairo, Tahoma, sans-serif' : '"Outfit Variable", Outfit, sans-serif',
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "72px 80px 60px",
      }}
    >
      {/* decorative shapes (physical positions — dir-immune) */}
      <div style={{ position: "absolute", top: -180, left: -160, width: 460, height: 460, borderRadius: 9999, border: `3px solid rgba(231,184,76,0.35)` }} />
      <div style={{ position: "absolute", top: -60, left: -40, width: 220, height: 220, borderRadius: 9999, background: "rgba(255,255,255,0.05)" }} />
      <div style={{ position: "absolute", bottom: -200, right: -180, width: 560, height: 560, borderRadius: 9999, border: `3px solid rgba(255,255,255,0.14)` }} />
      <div style={{ position: "absolute", bottom: -60, right: -30, width: 260, height: 260, borderRadius: 9999, background: "rgba(231,184,76,0.12)" }} />
      <div style={{ position: "absolute", top: 420, right: -120, width: 240, height: 240, borderRadius: 9999, background: "rgba(255,255,255,0.04)" }} />
      <div style={{ position: "absolute", top: 1150, left: -110, width: 220, height: 220, borderRadius: 9999, border: `2px solid rgba(231,184,76,0.30)` }} />

      {/* header: logo + camp name */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, marginTop: 10 }}>
        <div style={{ width: 150, height: 150, borderRadius: 9999, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "0 18px 50px rgba(0,0,0,0.35)" }}>
          <img src={logoSrc} alt="Happy inside expérience" style={{ width: "82%", height: "82%", objectFit: "contain" }} />
        </div>
        <p style={{ margin: 0, fontSize: 52, fontWeight: 800, letterSpacing: 0.5, textAlign: "center" }}>
          {meta?.nameEn || "Happy inside expérience"}
        </p>
        <p style={{ margin: 0, fontSize: 27, fontWeight: 600, opacity: 0.85, textAlign: "center" }}>
          {isAr ? "مخيّم أخصائيي وعاملات القطاع النفسي — الجزائر 🇩🇿" : "Camp des psychologues d'Algérie 🇩🇿"}
        </p>
      </div>

      {/* middle: identity */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, width: "100%" }}>
        <span style={{ fontSize: 32, fontWeight: 800, padding: "14px 44px", borderRadius: 9999, background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.28)", letterSpacing: 0.5 }}>
          {isAr ? "🌿 أنا سأكون هناك" : "🌿 Je serai là"}
        </span>
        <p
          style={{
            margin: 0,
            fontSize: fname.length > 12 ? 76 : 100,
            fontWeight: 900,
            lineHeight: 1.15,
            textAlign: "center",
            textShadow: "0 10px 40px rgba(0,0,0,0.35)",
            overflowWrap: "anywhere",
            maxWidth: 900,
          }}
        >
          {fname}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontSize: 30, fontWeight: 800, padding: "10px 34px", borderRadius: 9999, background: props.accountType === "student" ? "rgba(255,255,255,0.92)" : GOLD, color: props.accountType === "student" ? TEAL_DARK : TEAL_DARK }}>
            {props.accountType === "student" ? "🎓" : "💼"} {typeLabel}
          </span>
          {seatNumber ? (
            <span style={{ fontSize: 30, fontWeight: 900, padding: "10px 34px", borderRadius: 9999, background: "rgba(0,0,0,0.28)", border: "2px solid rgba(231,184,76,0.65)", color: GOLD }}>
              {isAr ? `المشارك رقم ${seatNumber}` : `Participant n° ${seatNumber}`}
            </span>
          ) : null}
        </div>
      </div>

      {/* info card: dates + place */}
      <div style={{ width: "100%", background: "rgba(255,255,255,0.10)", border: "2px solid rgba(255,255,255,0.22)", borderRadius: 40, padding: "34px 40px", display: "flex", flexDirection: "column", gap: 20, marginBottom: 42 }}>
        {dates ? (
          <div style={{ display: "flex", alignItems: "center", gap: 18, justifyContent: "center" }}>
            <span style={{ fontSize: 34 }}>📅</span>
            <span style={{ fontSize: 34, fontWeight: 800 }}>{dates}</span>
          </div>
        ) : null}
        {meta ? (
          <div style={{ display: "flex", alignItems: "center", gap: 18, justifyContent: "center" }}>
            <span style={{ fontSize: 34 }}>📍</span>
            <span style={{ fontSize: 34, fontWeight: 800 }}>{isAr ? meta.locationAr : meta.locationFr}</span>
          </div>
        ) : null}
      </div>

      {/* QR + CTA */}
      <div style={{ display: "flex", alignItems: "center", gap: 34, marginBottom: 46 }}>
        <div style={{ background: "#FFFFFF", borderRadius: 30, padding: 18, boxShadow: "0 16px 44px rgba(0,0,0,0.30)" }}>
          {qr ? (
            <img src={qr} alt="QR" width={210} height={210} style={{ display: "block", borderRadius: 12 }} />
          ) : (
            <div style={{ width: 210, height: 210 }} />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
          <span style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.35 }}>
            {isAr ? "امسح الرمز" : "Scanne le QR"}
          </span>
          <span style={{ fontSize: 28, fontWeight: 700, opacity: 0.9, lineHeight: 1.4 }}>
            {isAr ? "وسجّل مقعدك في المخيم قبل اكتمال الأماكن" : "et réserve ta place avant complet"}
          </span>
        </div>
      </div>

      {/* footer URL */}
      <p dir="ltr" style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: 1, color: CREAM, opacity: 0.95 }}>
        {origin ? origin.replace(/^https?:\/\//, "") : ""}
      </p>
      <p style={{ margin: "14px 0 0", fontSize: 22, fontWeight: 600, opacity: 0.6 }}>
        {props.status === "confirmed"
          ? isAr
            ? `بطاقة مشاركة — مخيم ${meta?.edition ?? 1} ✦ Happy inside expérience`
            : `Carte de partage — camp édition ${meta?.edition ?? 1} ✦ Happy inside expérience`
          : isAr
            ? `بانتظار التأكيد ✦ Happy inside expérience`
            : `En attente de confirmation ✦ Happy inside expérience`}
      </p>
    </div>
  );

  return (
    <>
      {/* trigger button (placed next to the participant-card PNG download) */}
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="story-btn h-10 rounded-xl border-brand/40 font-extrabold text-brand hover:bg-brand hover:text-white"
      >
        <Instagram className="h-4 w-4" />
        {t.story.button}
        <Sparkles className="h-3.5 w-3.5 text-brand-3" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto border-brand/25 p-4 sm:max-w-md sm:p-5">
          <DialogHeader className="text-start">
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <Instagram className="h-5 w-5 text-brand-2" />
              {t.story.title}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] font-semibold leading-relaxed">
              {t.story.desc}
            </DialogDescription>
          </DialogHeader>

          {/* scaled live preview (RTL-immune: physical top/left + transform) */}
          <div className="story-preview-frame mx-auto w-fit rounded-2xl border border-border p-3 shadow-inner">
            <div
              style={{
                width: STORY_W * PREVIEW_SCALE,
                height: STORY_H * PREVIEW_SCALE,
                position: "relative",
                overflow: "hidden",
                borderRadius: 14,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: STORY_W,
                  height: STORY_H,
                  transform: `scale(${PREVIEW_SCALE})`,
                  transformOrigin: "top left",
                }}
              >
                {renderCard()}
              </div>
            </div>
          </div>

          {/* pristine capture copy — off-screen, zero transforms */}
          <div style={{ position: "fixed", left: -20000, top: 0, zIndex: -1, pointerEvents: "none" }} aria-hidden="true">
            <div ref={pristineRef}>{renderCard()}</div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button onClick={downloadPng} disabled={busy} className="story-btn h-11 flex-1 rounded-xl bg-gradient-to-r from-brand to-brand-2 font-extrabold text-white shadow-lg shadow-brand/25 hover:opacity-95">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t.story.download}
            </Button>
            {canShare ? (
              <Button onClick={sharePng} disabled={busy} variant="outline" className="story-btn h-11 flex-1 rounded-xl border-brand/40 font-extrabold text-brand hover:bg-brand hover:text-white">
                <Share2 className="h-4 w-4" />
                {t.story.share}
              </Button>
            ) : null}
          </div>
          <p className="pb-1 text-center text-[11px] font-bold text-muted-foreground">{t.story.hint}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
