"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoSkeleton } from "@/components/shared/logo";
import {
  ArrowLeft,
  ArrowRight,
  Backpack,
  CalendarDays,
  Check,
  Circle,
  ClipboardCheck,
  IdCard,
  MapPin,
  QrCode,
  Images,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
 * /prep (Task 20) — PARTICIPANT PREP HUB
 * Participants-only page (active pending/confirmed registration).
 * Sections: countdown, saved interactive checklist (10 items,
 * progress ring), logistics info (dates/location from the camp
 * settings), and quick cards to the participant card, the QR
 * exchange and the memories album.
 * NO WhatsApp group section — intentionally excluded (Task 20 spec).
 * ============================================================ */

interface RegLite {
  registration: null | { code?: string | null; status: string };
}

function useCountdown(target: string) {
  const [diff, setDiff] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const ms = new Date(target).getTime() - Date.now();
      if (ms <= 0) return setDiff({ d: 0, h: 0, m: 0, s: 0 });
      setDiff({
        d: Math.floor(ms / 86400000),
        h: Math.floor((ms / 3600000) % 24),
        m: Math.floor((ms / 60000) % 60),
        s: Math.floor((ms / 1000) % 60),
      });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [target]);
  return diff;
}

export default function PrepPage() {
  const { t, lang, dir } = useLang();
  const { user, loading: sessionLoading } = useSession();

  const [regState, setRegState] = useState<"loading" | "none" | "ok">("loading");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [camp, setCamp] = useState<{
    startDate: string;
    endDate: string;
    locationAr: string;
    locationFr: string;
  } | null>(null);

  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;

  /* eligibility: registration (pending|confirmed) — admins don't use the hub.
   * No sync setState here: the no-user case is derived at render time. */
  useEffect(() => {
    if (sessionLoading || !user || user.role === "admin") return;
    fetch("/api/registration", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: RegLite) => setRegState(d.registration ? "ok" : "none"))
      .catch(() => setRegState("none"));
  }, [user, sessionLoading]);

  /* my saved checklist */
  useEffect(() => {
    if (sessionLoading || !user || user.role === "admin") return;
    fetch("/api/prep", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { checked: [] }))
      .then((d) => setChecked(new Set(Array.isArray(d.checked) ? d.checked : [])))
      .catch(() => {});
  }, [user, sessionLoading]);

  /* camp dates + location */
  useEffect(() => {
    fetch("/api/camp")
      .then((r) => r.json())
      .then((d) => setCamp(d.settings || null))
      .catch(() => {});
  }, []);

  const toggle = useCallback(
    (id: string) => {
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        // persist (fire-and-forget with busy flag for the dot indicator)
        setSaving(true);
        fetch("/api/prep", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checked: [...next] }),
        })
          .catch(() => {})
          .finally(() => setSaving(false));
        return next;
      });
    },
    []
  );

  const countdown = useCountdown(camp?.startDate || "2026-10-15T00:00:00.000Z");
  const percent = useMemo(
    () => Math.round((checked.size / Math.max(1, t.prep.items.length)) * 100),
    [checked, t.prep.items.length]
  );

  /* ------------------------------ guards ------------------------------ */
  if (sessionLoading || (!!user && user.role !== "admin" && regState === "loading")) {
    return <LogoSkeleton label={t.common.loading} />;
  }

  if (!user) {
    return (
      <Empty
        icon={<ClipboardCheck className="h-9 w-9" />}
        title={t.prep.loginRequired}
        cta={{ href: "/login", label: t.nav.login }}
      />
    );
  }

  if (user.role === "admin" || regState === "none") {
    return (
      <Empty
        icon={<Backpack className="h-9 w-9" />}
        title={t.prep.notRegistered}
        cta={{ href: user ? "/register" : "/login", label: user ? t.prep.notRegisteredCta : t.nav.login }}
      />
    );
  }

  /* ------------------------------ main ------------------------------ */
  const countdownBlocks = [
    { v: countdown.d, l: lang === "ar" ? "يوم" : "J" },
    { v: countdown.h, l: lang === "ar" ? "ساعة" : "H" },
    { v: countdown.m, l: lang === "ar" ? "دقيقة" : "Min" },
    { v: countdown.s, l: lang === "ar" ? "ثانية" : "Sec" },
  ];
  const dateLabel = camp
    ? new Date(camp.startDate).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const locationLabel = camp ? (lang === "ar" ? camp.locationAr : camp.locationFr) : "";

  return (
    <div className="relative min-h-[80vh] py-10">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-30" />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* header */}
        <div className="mb-8 text-center">
          <Badge className="mb-3 bg-brand/15 px-3.5 py-1.5 text-xs font-black text-brand">
            <ClipboardCheck className="me-1.5 h-3.5 w-3.5" />
            {t.prep.overline}
          </Badge>
          <h1 className="text-2xl font-black sm:text-3xl">{t.prep.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t.prep.subtitle}</p>
        </div>

        {/* countdown */}
        <div className="card-glow relative mb-6 overflow-hidden p-6 text-center">
          <div className="blob end-8 top-6 h-20 w-20 bg-brand-2/25" />
          <p className="mb-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
            {t.prep.countdownTitle}
          </p>
          <div className="flex items-stretch justify-center gap-2.5 sm:gap-4" dir="ltr">
            {countdownBlocks.map((b, i) => (
              <div
                key={i}
                className="min-w-[64px] rounded-2xl border border-brand/25 bg-gradient-to-b from-brand/10 to-brand-2/10 px-3 py-3 shadow-sm sm:min-w-[84px]"
              >
                <div className="text-2xl font-black tabular-nums text-brand sm:text-3xl">
                  {String(b.v).padStart(2, "0")}
                </div>
                <div className="mt-0.5 text-[10px] font-bold text-muted-foreground">{b.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* checklist */}
        <div className="card-glow relative mb-6 overflow-hidden p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <ClipboardCheck className="h-5 w-5 text-brand" />
              {t.prep.checklistTitle}
            </h2>
            <div className="flex items-center gap-3">
              {saving ? (
                <span className="text-[10px] font-bold text-muted-foreground">●</span>
              ) : null}
              <span className="text-xs font-black text-brand-2">
                {percent === 100 ? t.prep.allDone : fmt(t.prep.progress, { p: percent })}
              </span>
            </div>
          </div>
          {/* progress bar */}
          <div className="mb-5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand via-brand-3 to-brand-2 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mb-4 text-[11px] font-semibold text-muted-foreground">{t.prep.checklistHint}</p>

          <ul className="grid gap-2.5 sm:grid-cols-2">
            {t.prep.items.map((item) => {
              const done = checked.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    aria-pressed={done}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-2xl border p-3.5 text-start transition-all duration-200",
                      done
                        ? "border-brand/45 bg-brand/8"
                        : "border-border/70 bg-card/60 hover:border-brand/35 hover:bg-brand/5"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        done
                          ? "border-brand bg-brand text-white"
                          : "border-muted-foreground/40 text-transparent group-hover:border-brand/60"
                      )}
                      style={{ height: 22, width: 22 }}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2 opacity-0" />}
                    </span>
                    <span
                      className={cn(
                        "text-[13px] font-bold leading-snug",
                        done ? "text-brand line-through opacity-80" : "text-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* logistics */}
        <div className="card-glow relative mb-6 overflow-hidden p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
            <MapPin className="h-5 w-5 text-brand-2" />
            {t.prep.logisticsTitle}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {t.prep.datesTitle}
              </p>
              <p className="text-sm font-black">{dateLabel}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {t.prep.locationTitle}
              </p>
              <p className="text-sm font-black">{locationLabel}</p>
            </div>
          </div>
        </div>

        {/* quick cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickCard
            href="/dashboard"
            icon={<IdCard className="h-5 w-5" />}
            title={t.prep.cardTitle}
            desc={t.prep.cardDesc}
            cta={t.prep.cardCta}
          />
          <QuickCard
            href="/exchange"
            icon={<QrCode className="h-5 w-5" />}
            title={t.prep.exchangeTitle}
            desc={t.prep.exchangeDesc}
            cta={t.prep.exchangeCta}
          />
          <QuickCard
            href="/memories"
            icon={<Images className="h-5 w-5" />}
            title={t.prep.memoriesTitle}
            desc={t.prep.memoriesDesc}
            cta={t.prep.memoriesCta}
          />
        </div>

        <div className="mt-6 text-center">
          <Button asChild variant="ghost" className="rounded-full font-bold text-muted-foreground">
            <Link href="/dashboard">
              <Back className="h-4 w-4" />
              {t.nav.dashboard}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuickCard({
  href,
  icon,
  title,
  desc,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
}) {
  const { t } = useLang();
  return (
    <Link
      href={href}
      className="group flex flex-col items-center rounded-3xl border border-border/70 bg-card/70 p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
    >
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-md transition-transform group-hover:scale-110">
        {icon}
      </span>
      <span className="text-sm font-black">{title}</span>
      <span className="mt-1 text-[11px] font-semibold leading-relaxed text-muted-foreground">{desc}</span>
      <span className="mt-3 text-[11px] font-black text-brand group-hover:underline">
        {cta} <PartyPopper className="inline h-3 w-3" aria-hidden />
      </span>
      <span className="sr-only">{t.nav.more}</span>
    </Link>
  );
}

function Empty({
  icon,
  title,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  cta?: { href: string; label: string };
}) {
  const { t } = useLang();
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center px-4 py-12 text-center">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-30" />
      <div className="max-w-sm">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
          {icon}
        </div>
        <h1 className="text-xl font-black leading-relaxed">{title}</h1>
        {cta ? (
          <Button asChild className="mt-5 rounded-full px-6 font-extrabold shadow-lg shadow-brand/30">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="mt-5 rounded-full px-6 font-extrabold">
            <Link href="/">{t.nav.home}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

const fmt = (s: string, v: Record<string, string | number>): string =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
