"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session-context";
import { useLang } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LogoSkeleton } from "@/components/shared/logo";
import {
  GraduationCap,
  Briefcase,
  Network,
  UserRound,
  Users,
  MapPin,
  Search,
  Sparkles,
  ShieldCheck,
  Loader2,
  Bell,
  IdCard,
  LogIn,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ============================================================
 * /alumni (Task 20) — ALUMNI NETWORK
 * Public opt-in directory of camp participants (confirmed seat
 * + explicit membership). Search + wilaya/workplace cards, join/
 * leave switch for logged-in participants, benefits panel.
 * NO phones / NO emails — ever.
 * ============================================================ */

interface AlumniMember {
  userId: string;
  fullName: string;
  accountType: "student" | "specialist";
  wilaya: string;
  wilayaFr: string;
  workplace: string;
  bio: string;
  avatar: string | null;
}

export default function AlumniPage() {
  const { t, lang } = useLang();
  const { user, loading: sessionLoading } = useSession();

  const [members, setMembers] = useState<AlumniMember[] | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const load = () =>
    fetch("/api/alumni")
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []))
      .catch(() => setMembers([]));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!user || user.role === "admin") {
      setIsMember(false);
      return;
    }
    fetch("/api/alumni", { method: "POST" })
      .then((r) => (r.ok ? r.json() : { member: false }))
      .then((d) => setIsMember(d.member === true))
      .catch(() => {});
  }, [user]);

  const toggleMembership = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/alumni", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ join: !isMember }),
      });
      if (!res.ok) throw new Error();
      setIsMember(!isMember);
      toast({ title: isMember ? t.alumni.left : t.alumni.joined });
      load();
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    if (!members) return null;
    const needle = q.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((m) =>
      [m.fullName, m.wilaya, m.wilayaFr, m.workplace, m.bio]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [members, q]);

  const isParticipant = !!user && user.role !== "admin";

  return (
    <div className="relative min-h-[80vh] py-10">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-30" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* header */}
        <div className="mb-8 text-center">
          <Badge className="mb-3 border-brand-2/40 bg-brand-2/10 px-3.5 py-1.5 text-xs font-black text-brand-2">
            <Network className="me-1.5 h-3.5 w-3.5" />
            {t.alumni.badge}
          </Badge>
          <h1 className="text-2xl font-black sm:text-3xl">{t.alumni.title}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {t.alumni.subtitle}
          </p>
        </div>

        {/* join panel */}
        {sessionLoading ? null : isParticipant ? (
          <div className="card-glow relative mx-auto mb-8 max-w-3xl overflow-hidden p-6">
            <div className="blob end-8 top-6 h-20 w-20 bg-brand-2/25" />
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-start">
              <span
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg",
                  isMember
                    ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30"
                    : "bg-gradient-to-br from-brand to-brand-2 shadow-brand/30"
                )}
              >
                <Network className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black">{t.alumni.joinTitle}</h2>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-muted-foreground">
                  {t.alumni.joinDesc}
                </p>
              </div>
              <Button
                onClick={toggleMembership}
                disabled={busy}
                variant={isMember ? "outline" : "default"}
                className={cn(
                  "h-11 shrink-0 rounded-xl px-6 font-extrabold",
                  isMember
                    ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                    : "bg-brand shadow-md shadow-brand/30 hover:bg-brand/90"
                )}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isMember ? <LogIn className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {isMember ? t.alumni.leave : t.alumni.join}
              </Button>
            </div>
          </div>
        ) : !user ? (
          <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-border/70 bg-muted/30 p-4 text-center text-[13px] font-bold text-muted-foreground">
            {t.alumni.loginToJoin}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* directory */}
          <section>
            {/* search */}
            <div className="relative mb-5">
              <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.alumni.searchPh}
                className="h-12 rounded-2xl border-border/70 bg-card/80 ps-10 font-bold shadow-sm"
                aria-label={t.alumni.searchPh}
              />
            </div>

            {filtered === null ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="shimmer h-28 rounded-3xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-12 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
                <p className="text-sm font-bold text-muted-foreground">{t.alumni.empty}</p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-center text-[11px] font-black text-brand-2">
                  {fmt(t.alumni.membersCount, { n: filtered.length })}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {filtered.map((m) => {
                    const isStudent = m.accountType === "student";
                    const CatIcon = isStudent ? GraduationCap : Briefcase;
                    const wilayaLabel = lang === "fr" && m.wilayaFr ? m.wilayaFr : m.wilaya;
                    return (
                      <div
                        key={m.userId}
                        className="memories-card group flex items-start gap-3 rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-lg"
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-2 shadow-md">
                          {m.avatar ? (
                            <img src={m.avatar} alt={m.fullName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-white">
                              <UserRound className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-black">{m.fullName}</p>
                            <Badge
                              variant="outline"
                              className="border-brand/35 px-1.5 py-0 text-[9px] font-black text-brand"
                            >
                              {t.alumni.badge}
                            </Badge>
                          </div>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-bold text-muted-foreground">
                            <span className={cn("inline-flex items-center gap-1", isStudent ? "text-brand-2" : "text-brand")}>
                              <CatIcon className="h-3 w-3" />
                              {isStudent ? t.alumni.student : t.alumni.specialist}
                            </span>
                            {wilayaLabel ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {wilayaLabel}
                              </span>
                            ) : null}
                            {m.workplace ? (
                              <span className="inline-flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {m.workplace}
                              </span>
                            ) : null}
                          </p>
                          {m.bio ? (
                            <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-relaxed text-muted-foreground">
                              {m.bio}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* benefits sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card-glow overflow-hidden p-5">
              <h2 className="mb-3 flex items-center gap-2 text-base font-black">
                <Sparkles className="h-5 w-5 text-brand" />
                {t.alumni.benefits}
              </h2>
              <ul className="space-y-2.5">
                {t.alumni.benefitsList.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] font-bold leading-relaxed">
                    <span className="mt-0.5 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-brand/12 text-brand" style={{ height: 18, width: 18 }}>
                      <Bell className="h-2.5 w-2.5" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <p className="text-[10px] font-bold leading-relaxed text-muted-foreground">
                  {t.alumni.privacyNote}
                </p>
              </div>
              <Button asChild variant="outline" className="mt-4 w-full rounded-xl font-extrabold">
                <Link href="/prep">
                  <IdCard className="h-4 w-4" />
                  {t.prep.title}
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const fmt = (s: string, v: Record<string, string | number>): string =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
