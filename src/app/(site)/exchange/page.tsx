"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoSkeleton } from "@/components/shared/logo";
import {
  GraduationCap,
  Briefcase,
  Loader2,
  UserRound,
  PhoneOff,
  Phone,
  MapPin,
  Download,
  Check,
  BadgeCheck,
  SearchX,
  LogIn,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

/* ============================================================
 * /exchange (Task 20) — scan target of the QR networking card
 * A colleague's phone camera opens /exchange?code=HIEX-XXXXXX.
 * Requires login → shows the participant's professional profile
 * (masked name unless self, wilaya, workplace, bio) and a one-tap
 * vCard download. Phone appears ONLY when the owner opted in.
 * ============================================================ */

interface ExchangeProfile {
  isSelf: boolean;
  code: string;
  status: "pending" | "confirmed";
  attended: boolean;
  fullName: string;
  accountType: "student" | "specialist";
  wilaya: string;
  wilayaFr: string;
  workplace: string;
  bio: string;
  avatar: string | null;
  phone: string | null;
}

type State =
  | { kind: "loading" }
  | { kind: "login" }
  | { kind: "notfound" }
  | { kind: "ready"; profile: ExchangeProfile };

const fmt = (s: string, v: Record<string, string | number>): string =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export default function ExchangePage() {
  return (
    <Suspense fallback={<LogoSkeleton label="..." />}>
      <ExchangeInner />
    </Suspense>
  );
}

function ExchangeInner() {
  const { t, lang } = useLang();
  const { user, loading: sessionLoading } = useSession();
  const searchParams = useSearchParams();
  const code = (searchParams?.get("code") || "").trim().toUpperCase();
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(() => {
    if (!code) return; // render handles the missing-code case
    fetch(`/api/exchange?code=${encodeURIComponent(code)}`, { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) return { kind: "login" as const };
        if (!r.ok) return { kind: "notfound" as const };
        const d = await r.json();
        return { kind: "ready" as const, profile: d };
      })
      .then((s) => setState(s as State))
      .catch(() => setState({ kind: "notfound" }));
  }, [code]);

  useEffect(() => {
    if (sessionLoading) return;
    load();
  }, [sessionLoading, load]);

  if (sessionLoading || (state.kind === "loading" && !!code)) {
    return <LogoSkeleton label={t.common.loading} />;
  }

  if (state.kind === "login") {
    return (
      <Centered>
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
          <LogIn className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-black">{t.exchange.loginRequired}</h1>
        <Button asChild className="mt-5 rounded-full px-6 font-extrabold shadow-lg shadow-brand/30">
          <Link href="/login">{t.nav.login}</Link>
        </Button>
      </Centered>
    );
  }

  if (!code || state.kind === "notfound") {
    return (
      <Centered>
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <SearchX className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-black">{t.exchange.notFound}</h1>
        <Button asChild variant="outline" className="mt-5 rounded-full px-6 font-extrabold">
          <Link href="/">{t.nav.home}</Link>
        </Button>
      </Centered>
    );
  }

  /* TS narrowing: after the guards above only "ready" can reach here */
  if (state.kind !== "ready") return <LogoSkeleton label={t.common.loading} />;
  const p = state.profile;
  const isStudent = p.accountType === "student";
  const CatIcon = isStudent ? GraduationCap : Briefcase;
  const wilayaLabel = lang === "fr" && p.wilayaFr ? p.wilayaFr : p.wilaya;

  const saveVcf = () => {
    const esc = (s: string) => String(s || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${esc(p.fullName)}`,
      `N:${esc(p.fullName)};;;;`,
      `ORG:${esc(p.workplace)}`,
      `NOTE:${esc(`${t.alumni.badge} — Happy inside expérience (${p.code})${p.bio ? `\n${p.bio}` : ""}`)}`,
    ];
    if (p.phone) lines.push(`TEL;TYPE=CELL:${esc(p.phone)}`);
    lines.push("END:VCARD");
    const blob = new Blob([lines.join("\r\n")], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.code}.vcf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: t.exchange.saved });
  };

  return (
    <div className="relative min-h-[75vh] py-10">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-30" />
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        {/* identity card */}
        <div className="card-glow overflow-hidden rounded-[2rem] border border-brand-2/25 bg-card/80 shadow-xl backdrop-blur">
          <div className="relative h-24 bg-gradient-to-r from-brand-3/25 via-brand/20 to-brand-2/25">
            <div className="blob end-6 top-4 h-16 w-16 bg-brand-2/30" />
          </div>
          <div className="px-6 pb-6">
            <div className="-mt-12 flex items-end justify-between gap-3">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-4 border-card bg-gradient-to-br from-brand to-brand-2 shadow-xl">
                {p.avatar ? (
                  <img src={p.avatar} alt={p.fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white">
                    <UserRound className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="mb-1 flex flex-wrap justify-end gap-1.5">
                <Badge className="bg-brand-2/15 px-2.5 py-1 text-[10px] font-black text-brand-2">
                  <CatIcon className="me-1 h-3 w-3" />
                  {isStudent ? t.alumni.student : t.alumni.specialist}
                </Badge>
                <Badge variant="outline" className="border-brand/40 px-2.5 py-1 text-[10px] font-black text-brand">
                  <BadgeCheck className="me-1 h-3 w-3" />
                  {t.alumni.badge}
                </Badge>
              </div>
            </div>

            <h1 className="mt-3 text-2xl font-black leading-tight">{p.fullName}</h1>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              {p.isSelf ? t.exchange.selfCard : t.exchange.member}
              {p.attended ? ` · ${t.exchange.attended}` : ""}
            </p>

            <div className="mt-4 space-y-2 text-sm">
              {wilayaLabel ? (
                <p className="flex items-center gap-2 font-bold">
                  <MapPin className="h-4 w-4 shrink-0 text-brand" />
                  {wilayaLabel}
                </p>
              ) : null}
              {p.workplace ? (
                <p className="flex items-center gap-2 font-bold">
                  <Briefcase className="h-4 w-4 shrink-0 text-brand" />
                  {p.workplace}
                </p>
              ) : null}
              {p.bio ? (
                <p className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-[13px] font-semibold leading-relaxed text-muted-foreground">
                  {p.bio}
                </p>
              ) : null}
              <p
                className={
                  "flex items-center gap-2 text-[12px] font-bold " +
                  (p.phone ? "text-foreground" : "text-muted-foreground")
                }
                dir="ltr"
              >
                {p.phone ? (
                  <>
                    <Phone className="h-4 w-4 shrink-0 text-brand-2" />
                    {p.phone}
                  </>
                ) : (
                  <>
                    <PhoneOff className="h-4 w-4 shrink-0" />
                    {t.exchange.phoneHidden}
                  </>
                )}
              </p>
            </div>

            {!p.isSelf ? (
              <Button
                onClick={saveVcf}
                className="story-btn mt-5 h-12 w-full rounded-2xl bg-brand text-base font-black text-white shadow-lg shadow-brand/30 hover:bg-brand/90"
              >
                <Download className="h-5 w-5" />
                {t.exchange.saveContact}
                <Check className="h-4 w-4 opacity-0" aria-hidden />
              </Button>
            ) : null}
          </div>
        </div>

        {/* back home */}
        <div className="mt-5 text-center">
          <Button asChild variant="ghost" className="rounded-full font-bold text-muted-foreground">
            <Link href="/">{t.nav.home} ←</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center px-4 py-12 text-center">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-30" />
      <div className="max-w-sm">{children}</div>
    </div>
  );
}
