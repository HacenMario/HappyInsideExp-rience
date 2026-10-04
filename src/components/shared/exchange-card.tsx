"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { GraduationCap, Briefcase, Loader2, QrCode, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ============================================================
 * QR EXCHANGE CARD (Task 20) — "بطاقة تعارفي"
 * Dialog shown from the participant dashboard / participant card.
 * Renders a big QR that encodes {origin}/exchange?code=HIEX-XXXXXX
 * so any colleague's phone camera opens the owner's professional
 * profile with a one-tap "save contact" (vCard).
 * Includes the privacy switch: reveal my phone on scan (OFF default).
 * ============================================================ */

export default function ExchangeCardButton({
  code,
  fullName,
  accountType,
}: {
  code: string;
  fullName: string;
  accountType: "student" | "specialist";
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState("");
  const [sharePhone, setSharePhone] = useState(false);
  const [savingPref, setSavingPref] = useState(false);

  const CatIcon = accountType === "student" ? GraduationCap : Briefcase;

  useEffect(() => {
    if (!open || qr) return;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/exchange?code=${encodeURIComponent(code)}`
        : code;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(url, {
          width: 520,
          margin: 1,
          errorCorrectionLevel: "M",
        })
      )
      .then(setQr)
      .catch(() => {});
  }, [open, qr, code]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/exchange", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setSharePhone(d.sharePhone === true))
      .catch(() => {});
  }, [open]);

  const toggleShare = async (v: boolean) => {
    setSavingPref(true);
    try {
      const res = await fetch("/api/exchange", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharePhone: v }),
      });
      if (!res.ok) throw new Error();
      setSharePhone(v);
      toast({
        title: v ? t.exchange.sharePhoneOn : t.exchange.sharePhoneOff,
      });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setSavingPref(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="story-btn h-10 rounded-xl border-brand-2/40 font-extrabold text-brand-2 hover:bg-brand-2 hover:text-white"
      >
        <QrCode className="h-4 w-4" />
        {t.exchange.openMyCard}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto border-brand-2/25 p-4 sm:max-w-md sm:p-5">
          <DialogHeader className="text-start">
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <QrCode className="h-5 w-5 text-brand-2" />
              {t.exchange.title}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold leading-relaxed">
              {t.exchange.desc}
            </DialogDescription>
          </DialogHeader>

          {/* QR + identity */}
          <div className="exchange-frame mx-auto w-full max-w-[300px] rounded-3xl border-2 border-brand-2/30 bg-gradient-to-b from-card to-muted/40 p-5 text-center shadow-lg">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-2/10 px-3 py-1 text-[11px] font-extrabold text-brand-2">
              <CatIcon className="h-3.5 w-3.5" />
              {accountType === "student" ? t.alumni.student : t.alumni.specialist}
            </div>
            <p className="truncate text-base font-black">{fullName}</p>
            <p dir="ltr" className="mt-0.5 text-[10px] font-bold tracking-widest text-muted-foreground">
              {code}
            </p>
            <div className="mx-auto mt-4 w-full rounded-2xl bg-white p-3 shadow-inner">
              {qr ? (
                <img src={qr} alt={`QR ${code}`} className="mx-auto block h-auto w-full max-w-[240px]" />
              ) : (
                <div className="flex h-[240px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-2" />
                </div>
              )}
            </div>
            <p className="mt-3 text-[11px] font-bold text-muted-foreground" dir="ltr">
              /exchange?code={code}
            </p>
          </div>

          {/* how it works */}
          <div className="mt-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
            <p className="mb-2 text-xs font-black text-foreground">{t.exchange.howTitle}</p>
            <ol className="space-y-1.5">
              {t.exchange.howSteps.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-muted-foreground">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-2/15 text-[9px] font-black text-brand-2">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          {/* privacy switch */}
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex min-w-0 items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-xs font-black">{t.exchange.privacy}</p>
                <p
                  className={cn(
                    "mt-0.5 flex items-center gap-1 text-[11px] font-bold",
                    sharePhone ? "text-brand-2" : "text-muted-foreground"
                  )}
                >
                  {sharePhone ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {sharePhone ? t.exchange.sharePhoneOn : t.exchange.sharePhoneOff}
                </p>
              </div>
            </div>
            <Switch
              checked={sharePhone}
              onCheckedChange={toggleShare}
              disabled={savingPref}
              aria-label={t.exchange.sharePhone}
            />
            {savingPref ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
