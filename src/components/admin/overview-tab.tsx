"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SeatProgress } from "@/components/shared/seat-progress";
import {
  Users,
  CalendarCheck,
  Venus,
  Mars,
  Megaphone,
  Mail,
  Lightbulb,
  Image as ImageIcon,
  BellRing,
  ShieldAlert,
  TrendingUp,
  MessagesSquare,
  HandCoins,
  Clock,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalRegistered: number;
  totalSeats: number;
  seatsLeft: number;
  fillPercent: number;
  males: number;
  females: number;
  annCount: number;
  unreadMessages: number;
  suggestionsCount: number;
  mediaCount: number;
  pushSubsCount: number;
  registrationOpen: boolean;
  trend: { date: string; count: number }[];
  money: {
    fee: number;
    collected: number;
    expected: number;
    remaining: number;
    pendingCount: number;
    pendingPotential: number;
    confirmedCount: number;
  };
  recentRegistrations: { id: string; fullName: string; phone: string; status: string; createdAt: string }[];
  recentMessages: { id: string; name: string; subject: string; read: boolean; createdAt: string }[];
}

export default function OverviewTab() {
  const { t, lang } = useLang();
  const [data, setData] = useState<AdminStats | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/admin/stats", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => d.error || setData(d))
        .catch(() => {});
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, []);

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="shimmer h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const totalGender = data.males + data.females || 1;
  const femalePct = Math.round((data.females / totalGender) * 100);
  const malePct = 100 - femalePct;
  const maxTrend = Math.max(1, ...data.trend.map((x) => x.count));

  const cards = [
    {
      icon: <HandCoins className="h-5 w-5" />,
      label: t.admin.registrations.money.collected,
      value: `${new Intl.NumberFormat("fr-FR").format(data.money?.collected ?? 0)} DA`,
      color: "from-brand-2 to-emerald-500",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      label: t.admin.registrations.money.pendingCount,
      value: data.money?.pendingCount ?? 0,
      color: "from-amber-500 to-orange-400",
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: t.admin.overview.totalUsers,
      value: data.totalUsers,
      color: "from-brand to-brand-3",
    },
    {
      icon: <CalendarCheck className="h-5 w-5" />,
      label: t.admin.overview.totalRegistered,
      value: data.totalRegistered,
      color: "from-brand-2 to-brand",
    },
    {
      icon: <Venus className="h-5 w-5" />,
      label: t.admin.overview.females,
      value: data.females,
      color: "from-pink-500 to-rose-400",
    },
    {
      icon: <Mars className="h-5 w-5" />,
      label: t.admin.overview.males,
      value: data.males,
      color: "from-sky-500 to-cyan-500",
    },
    {
      icon: <Megaphone className="h-5 w-5" />,
      label: t.admin.overview.announcements,
      value: data.annCount,
      color: "from-brand-3 to-amber-500",
    },
    {
      icon: <Mail className="h-5 w-5" />,
      label: t.admin.overview.unreadMessages,
      value: data.unreadMessages,
      color: "from-orange-500 to-red-400",
    },
    {
      icon: <Lightbulb className="h-5 w-5" />,
      label: t.admin.overview.suggestions,
      value: data.suggestionsCount,
      color: "from-yellow-500 to-brand-3",
    },
    {
      icon: <BellRing className="h-5 w-5" />,
      label: "Push",
      value: data.pushSubsCount,
      color: "from-brand to-brand-2",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <Card key={i} className="card-glow border-0 p-0" style={{ animationDelay: `${i * 50}ms` }}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground">{c.label}</p>
                  <p className="mt-1 text-2xl font-black sm:text-3xl">{c.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${c.color} text-white shadow-lg`}>
                  {c.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Seats */}
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-black">{t.admin.overview.seatsFill}</h3>
              <Badge className={data.registrationOpen ? "bg-brand-2/15 text-brand-2" : "bg-destructive/15 text-destructive"}>
                {data.registrationOpen ? t.campReg.open : t.campReg.closed}
              </Badge>
            </div>
            <SeatProgress registered={data.totalRegistered} total={data.totalSeats} />
          </CardContent>
        </Card>

        {/* Gender ratio */}
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-black">{t.admin.overview.genderRatio}</h3>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="relative mx-auto h-24 w-24">
                  <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3.4" className="text-muted" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                      strokeDasharray={`${femalePct * 1.0} 100`}
                      className="text-pink-500 transition-all duration-1000"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-black">{femalePct}%</span>
                </div>
                <p className="mt-2 flex items-center justify-center gap-1 text-sm font-bold text-pink-500">
                  <Venus className="h-4 w-4" /> {t.admin.overview.females} ({data.females})
                </p>
              </div>
              <div className="text-center">
                <div className="relative mx-auto h-24 w-24">
                  <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3.4" className="text-muted" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                      strokeDasharray={`${malePct * 1.0} 100`}
                      className="text-sky-500 transition-all duration-1000"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-black">{malePct}%</span>
                </div>
                <p className="mt-2 flex items-center justify-center gap-1 text-sm font-bold text-sky-500">
                  <Mars className="h-4 w-4" /> {t.admin.overview.males} ({data.males})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-black">
              <TrendingUp className="h-4.5 w-4.5 text-brand-2" />
              {lang === "ar" ? "تطور التسجيلات (14 يوم)" : "Évolution des inscriptions (14 jours)"}
            </h3>
            <div className="flex h-32 items-end gap-1.5">
              {data.trend.map((d, i) => (
                <div key={i} className="group relative flex-1">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand to-brand-3 transition-all duration-500 group-hover:opacity-80"
                    style={{ height: `${Math.max(4, (d.count / maxTrend) * 110)}px` }}
                  />
                  <span className="pointer-events-none absolute -top-7 start-1/2 -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 text-[9px] font-bold text-background opacity-0 transition-opacity group-hover:opacity-100 rtl:translate-x-1/2">
                    {d.count}
                  </span>
                  <p className="mt-1 text-center text-[8px] text-muted-foreground">{d.date}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent registrations + messages */}
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-black">
              <MessagesSquare className="h-4.5 w-4.5 text-brand" />
              {t.admin.overview.recentRegistrations}
            </h3>
            <div className="scroll-area max-h-44 space-y-2 overflow-y-auto pe-1">
              {data.recentRegistrations.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t.common.noData}</p>
              ) : (
                data.recentRegistrations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{r.fullName}</p>
                      <p className="text-[10px] text-muted-foreground" dir="ltr">{r.phone}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={
                          "h-2 w-2 rounded-full " +
                          (r.status === "confirmed"
                            ? "bg-brand-2"
                            : r.status === "pending"
                              ? "bg-amber-500"
                              : "bg-muted-foreground/40")
                        }
                        title={r.status === "confirmed" ? t.campReg.confirmed : r.status === "pending" ? t.campReg.pending : t.campReg.cancelledStatus}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Link href="/admin?tab=registrations" className="flex-1">
                <button className="w-full rounded-xl bg-brand/10 py-2 text-xs font-extrabold text-brand transition-colors hover:bg-brand hover:text-white">
                  {t.admin.registrations.title}
                </button>
              </Link>
              <Link href="/admin?tab=messages" className="flex-1">
                <button className="w-full rounded-xl bg-brand-2/10 py-2 text-xs font-extrabold text-brand-2 transition-colors hover:bg-brand-2 hover:text-white">
                  {t.admin.messages.title} {data.unreadMessages > 0 ? `(${data.unreadMessages})` : ""}
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
