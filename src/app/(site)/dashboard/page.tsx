"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/session-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SeatProgress } from "@/components/shared/seat-progress";
import { LogoSkeleton } from "@/components/shared/logo";
import { useCampInfo } from "@/components/shared/camp-info";
import { WilayaSelect } from "@/components/shared/wilaya-select";
import { fileToDataUrl } from "@/lib/image-client";
import {
  UserRound,
  CalendarCheck,
  Bell,
  PartyPopper,
  CalendarDays,
  MapPin,
  Trophy,
  Camera,
  Trash2,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  LogIn,
  Banknote,
  Hourglass,
} from "lucide-react";

interface RegInfo {
  id: string;
  status: "pending" | "confirmed";
  accountType?: "student" | "specialist";
  amountDue?: number | null;
  amountPaid: number | null;
  createdAt: string;
}

type DashTab = "registration" | "profile" | "notifications";

const fmtDA = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export default function DashboardPage() {
  const { t, lang } = useLang();
  const { user, loading: sessionLoading, refresh } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const camp = useCampInfo();

  const [reg, setReg] = useState<RegInfo | null>(null);
  const [regLoading, setRegLoading] = useState(true);
  const [seats, setSeats] = useState<{ registered: number; totalSeats: number; registrationOpen: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const [profile, setProfile] = useState({ fullName: "", wilaya: "", workplace: "", bio: "", avatar: null as string | null });
  const [savingProfile, setSavingProfile] = useState(false);
  const [tab, setTab] = useState<DashTab>("registration");
  const [highlightCard, setHighlightCard] = useState(false);
  const bookHandled = React.useRef(false);

  const loadReg = useCallback(async () => {
    try {
      const [regRes, statsRes] = await Promise.all([
        fetch("/api/registration", { cache: "no-store" }),
        fetch("/api/stats", { cache: "no-store" }),
      ]);
      const regData = await regRes.json();
      const statsData = await statsRes.json();
      setReg(regData.registration);
      setSeats(statsData);
    } catch {} finally {
      setRegLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      loadReg();
      setProfile({
        fullName: user.fullName,
        wilaya: user.wilaya,
        workplace: user.workplace,
        bio: user.bio,
        avatar: user.avatar,
      });
    }
  }, [user, sessionLoading, router, loadReg]);

  /* Deep link support: /dashboard?tab=profile and /dashboard?tab=registration&book=1
     (the "احجز مقعدك الآن" flow lands on the camp registration card). */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tParam = params.get("tab");
    if (tParam === "profile" || tParam === "notifications" || tParam === "registration") {
      setTab(tParam);
    }
    if (params.get("book") === "1") bookHandled.current = false; // fresh booking navigation
  }, []);

  useEffect(() => {
    if (bookHandled.current) return;
    if (sessionLoading || !user || regLoading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("book") !== "1") return;
    bookHandled.current = true;
    setTab("registration");
    // wait for the card to paint, then scroll to it and pulse-highlight it
    requestAnimationFrame(() => {
      const el = document.getElementById("camp-registration-card");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightCard(true);
        window.setTimeout(() => setHighlightCard(false), 2600);
      }
    });
    // clean the query so refreshes don't re-scroll
    window.history.replaceState({}, "", "/dashboard");
  }, [sessionLoading, user, regLoading]);

  if (sessionLoading || !user) {
    return <LogoSkeleton label={t.common.loading} />;
  }

  const reserve = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/registration", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: t.campReg.success, description: t.campReg.pendingDesc });
        await loadReg();
      } else {
        const msg =
          { already_registered: t.campReg.alreadyRegistered, full: t.campReg.full, closed: t.campReg.closed }[data.error] ||
          t.common.error;
        toast({ title: t.common.error, description: msg, variant: "destructive" });
      }
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const cancelReg = async () => {
    if (!window.confirm(t.campReg.confirmCancel)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/registration", { method: "DELETE" });
      if (res.ok) {
        toast({ title: t.common.success, description: t.campReg.cancelled });
        await loadReg();
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        toast({ title: t.common.success, description: t.dash.profileSaved });
        await refresh();
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const onPhotoChange = async (file: File | undefined) => {
    if (!file) return;
    // Compressed in-browser — avatars stay tiny (≤ ~300 KB) on any host
    const dataUrl = await fileToDataUrl(file, { maxDim: 512, quality: 0.85, maxBytes: 300 * 1024 });
    setProfile((p) => ({ ...p, avatar: dataUrl }));
  };

  return (
    <div className="relative min-h-[70vh] py-10">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-40" />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Welcome header */}
        <div className="mb-7 flex flex-col items-center gap-4 rounded-[2rem] border border-brand/25 bg-gradient-to-r from-brand/10 via-brand-3/10 to-brand-2/10 p-6 text-center shadow-lg sm:flex-row sm:text-start">
          {profile.avatar ? (
            <Image src={profile.avatar} alt={user.fullName} width={80} height={80} className="h-16 w-16 rounded-2xl border-2 border-brand/50 object-cover shadow-lg" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-2xl font-black text-white shadow-lg">
              {user.fullName.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-black sm:text-2xl">
              {t.dash.welcome} <span className="text-gradient">{user.fullName}</span> 👋
            </h1>
            <p className="text-xs text-muted-foreground" dir="ltr">{user.phone}</p>
          </div>
          {user.role === "admin" ? (
            <Link href="/admin">
              <Button variant="outline" className="rounded-full font-bold">🛡️ {t.nav.adminPanel}</Button>
            </Link>
          ) : null}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as DashTab)} dir={lang === "ar" ? "rtl" : "ltr"} className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl p-1.5">
            <TabsTrigger value="registration" className="gap-1.5 rounded-xl font-bold data-[state=active]:shadow-md">
              <CalendarCheck className="h-4 w-4" />
              <span className="hidden sm:inline">{t.dash.myReg}</span>
              <span className="sm:hidden">{lang === "ar" ? "تسجيلي" : "Inscription"}</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5 rounded-xl font-bold data-[state=active]:shadow-md">
              <UserRound className="h-4 w-4" />
              <span className="hidden sm:inline">{t.dash.myProfile}</span>
              <span className="sm:hidden">{lang === "ar" ? "ملفي" : "Profil"}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 rounded-xl font-bold data-[state=active]:shadow-md">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t.dash.myNotifications}</span>
              <span className="sm:hidden">{lang === "ar" ? "إشعارات" : "Notifs"}</span>
            </TabsTrigger>
          </TabsList>

          {/* ===== Registration tab ===== */}
          <TabsContent value="registration" className="mt-5">
            <Card
              id="camp-registration-card"
              className={
                "card-glow border-0 p-0 transition-all duration-500 " +
                (highlightCard ? "ring-4 ring-brand/60 shadow-2xl shadow-brand/25" : "")
              }
            >
              <CardContent className="p-6 sm:p-8">
                {regLoading ? (
                  <div className="space-y-3">
                    <div className="shimmer h-6 w-48 rounded-full" />
                    <div className="shimmer h-4 w-full rounded-full" />
                  </div>
                ) : reg ? (
                  reg.status === "pending" ? (
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xl">
                        <Hourglass className="h-10 w-10" />
                      </div>
                      <h2 className="text-xl font-black">{t.campReg.pendingTitle}</h2>
                      <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2">
                        <Badge className="bg-amber-500/15 px-3.5 py-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                          <Clock className="me-1 h-4 w-4" /> {t.campReg.pending}
                        </Badge>
                        <Badge variant="outline" className="px-3.5 py-1.5 text-xs font-bold">
                          <CalendarDays className="me-1 h-4 w-4" />
                          {t.campReg.registeredOn}:{" "}
                          {new Date(reg.createdAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </Badge>
                      </div>
                      {(() => {
                        const due =
                          reg.amountDue != null
                            ? reg.amountDue
                            : user.accountType === "student"
                              ? camp.studentFee
                              : camp.specialistFee;
                        return due > 0 ? (
                          <div className="mx-auto mt-5 flex max-w-sm items-center justify-between rounded-2xl border border-brand/30 bg-brand/5 px-5 py-4">
                            <span className="flex items-center gap-2 text-sm font-bold">
                              <Banknote className="h-5 w-5 text-brand" />
                              {t.campReg.feeDue}
                            </span>
                            <span className="text-xl font-black tabular-nums text-brand">
                              {fmtDA(due)}
                              <span className="ms-1 text-xs">DA</span>
                            </span>
                          </div>
                        ) : null;
                      })()}
                      <div className="mx-auto mt-4 max-w-md space-y-2 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm font-semibold text-amber-700 dark:text-amber-300">
                        <p>{t.campReg.pendingDesc}</p>
                        <p className="text-xs opacity-80">{t.campReg.contactAdminFee}</p>
                      </div>
                      <div className="mt-6">
                        <Button variant="outline" onClick={cancelReg} disabled={busy} className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive">
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          {t.campReg.cancelReg}
                        </Button>
                      </div>
                    </div>
                  ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-white shadow-xl">
                      <PartyPopper className="h-10 w-10" />
                    </div>
                    <h2 className="text-xl font-black">{t.campReg.alreadyRegistered}</h2>
                    <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2">
                      <Badge className="bg-brand-2/15 px-3.5 py-1.5 text-xs font-extrabold text-brand-2">
                        <CheckCircle2 className="me-1 h-4 w-4" /> {t.campReg.confirmed}
                      </Badge>
                      {reg.amountPaid != null && reg.amountPaid > 0 ? (
                        <Badge className="bg-brand/15 px-3.5 py-1.5 text-xs font-extrabold text-brand">
                          <Banknote className="me-1 h-4 w-4" />
                          {t.campReg.amountPaid}: {new Intl.NumberFormat("fr-FR").format(reg.amountPaid)} DA
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className="px-3.5 py-1.5 text-xs font-bold">
                        <CalendarDays className="me-1 h-4 w-4" />
                        {t.campReg.registeredOn}:{" "}
                        {new Date(reg.createdAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </Badge>
                    </div>
                    <div className="mx-auto mt-6 max-w-md rounded-2xl border border-brand-2/25 bg-brand-2/5 p-4 text-sm font-bold text-brand-2">
                      <Trophy className="me-2 inline h-4 w-4" />
                      {lang === "ar"
                        ? "مقعدك محجوز ومؤكد! سنتواصل معك قريباً بكل التفاصيل"
                        : "Ta place est réservée et confirmée ! Nous te contacterons bientôt avec tous les détails"}
                    </div>
                    <div className="mt-6">
                      <Button variant="outline" onClick={cancelReg} disabled={busy} className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        {t.campReg.cancelReg}
                      </Button>
                    </div>
                  </div>
                  )
                ) : (
                  <div>
                    <div className="mb-5 text-center">
                      <h2 className="text-xl font-black">{t.campReg.title}</h2>
                      <p className="text-sm text-muted-foreground">{t.campReg.subtitle}</p>
                      {seats ? (
                        <Badge
                          className={
                            "mt-2 px-3 py-1 text-xs font-extrabold " +
                            (seats.registrationOpen ? "bg-brand-2/15 text-brand-2" : "bg-destructive/15 text-destructive")
                          }
                        >
                          {seats.registrationOpen ? t.campReg.open : t.campReg.closed}
                        </Badge>
                      ) : null}
                    </div>
                    {seats ? <SeatProgress registered={seats.registered} total={seats.totalSeats} className="mb-6" /> : null}
                    {camp.loaded && (camp.studentFee > 0 || camp.specialistFee > 0) ? (
                      <div className="mx-auto mb-5 flex max-w-md flex-wrap items-center justify-center gap-x-5 gap-y-1.5 rounded-2xl border border-brand/25 bg-brand/5 px-4 py-3 text-xs font-bold">
                        <span
                          className={
                            user.accountType === "student"
                              ? "flex items-center gap-1 text-brand-2 underline decoration-brand-2/50 decoration-2 underline-offset-4"
                              : "flex items-center gap-1 text-muted-foreground"
                          }
                        >
                          🎓 {t.campReg.studentPrice}: {fmtDA(camp.studentFee)} DA
                        </span>
                        <span
                          className={
                            user.accountType === "specialist"
                              ? "flex items-center gap-1 text-brand underline decoration-brand/50 decoration-2 underline-offset-4"
                              : "flex items-center gap-1 text-muted-foreground"
                          }
                        >
                          💼 {t.campReg.specialistPrice}: {fmtDA(camp.specialistFee)} DA
                        </span>
                      </div>
                    ) : null}
                    <Button
                      onClick={reserve}
                      disabled={busy || !seats?.registrationOpen}
                      className="h-13 w-full rounded-2xl py-6 text-base font-extrabold shadow-xl shadow-brand/30"
                    >
                      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <PartyPopper className="h-5 w-5" />}
                      {t.campReg.registerBtn}
                    </Button>
                    {!user ? null : null}
                    {!seats?.registrationOpen ? (
                      <p className="mt-3 text-center text-xs text-muted-foreground">{t.campReg.notifyMe}</p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Profile tab ===== */}
          <TabsContent value="profile" className="mt-5">
            <Card className="card-glow border-0 p-0">
              <CardContent className="p-6 sm:p-8">
                {/* Avatar */}
                <div className="mb-6 flex flex-col items-center gap-3">
                  <div className="relative">
                    {profile.avatar ? (
                      <Image src={profile.avatar} alt={user.fullName} width={112} height={112} className="h-24 w-24 rounded-3xl border-2 border-brand/50 object-cover shadow-lg" />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-brand to-brand-2 text-3xl font-black text-white shadow-lg">
                        {user.fullName.charAt(0)}
                      </div>
                    )}
                    <label className="absolute -bottom-2 -end-2 cursor-pointer rounded-full bg-brand p-2 text-white shadow-lg transition-transform hover:scale-110">
                      <Camera className="h-4 w-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhotoChange(e.target.files?.[0])} />
                    </label>
                  </div>
                  {profile.avatar ? (
                    <button
                      onClick={() => setProfile({ ...profile, avatar: null })}
                      className="flex items-center gap-1 text-xs font-bold text-destructive hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> {t.dash.removePhoto}
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t.common.fullName}</Label>
                    <Input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.common.phone}</Label>
                    <Input value={user.phone} disabled dir="ltr" className="h-11 text-start opacity-70" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.common.wilaya}</Label>
                    <WilayaSelect
                      value={profile.wilaya}
                      onValueChange={(v) => setProfile({ ...profile, wilaya: v })}
                      placeholder={t.common.wilayaPlaceholder}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.common.workplace}</Label>
                    <Input value={profile.workplace} onChange={(e) => setProfile({ ...profile, workplace: e.target.value })} className="h-11" />
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <Label>{t.common.bio}</Label>
                  <Textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} />
                </div>
                <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge variant="outline" className="text-xs font-bold">
                      {t.common.gender}: {user.gender === "female" ? "👩 " + t.common.female : "👨 " + t.common.male}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        "text-xs font-bold " +
                        (user.accountType === "student"
                          ? "border-brand-2/40 text-brand-2"
                          : "border-brand/40 text-brand")
                      }
                    >
                      {user.accountType === "student"
                        ? "🎓 " + (user.gender === "female" ? t.common.studentF : t.common.student)
                        : "💼 " + (user.gender === "female" ? t.common.specialistF : t.common.specialist)}
                    </Badge>
                  </div>
                  <Button onClick={saveProfile} disabled={savingProfile} className="w-full rounded-xl font-extrabold shadow-lg shadow-brand/25 sm:w-auto sm:px-8">
                    {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t.dash.saveProfile}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Notifications tab ===== */}
          <TabsContent value="notifications" className="mt-5">
            <Card className="card-glow border-0 p-0">
              <CardContent className="p-6">
                <UserNotifications />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function UserNotifications() {
  const { t, lang } = useLang();
  const [items, setItems] = useState<
    { id: string; titleAr: string; titleFr: string; bodyAr: string; bodyFr: string; link: string | null; read: boolean; createdAt: string }[]
  >([]);

  useEffect(() => {
    const load = () =>
      fetch("/api/notifications", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setItems(d.notifications || []))
        .catch(() => {});
    load();
    const iv = setInterval(load, 25000);
    return () => clearInterval(iv);
  }, []);

  const markAll = async () => {
    await fetch("/api/notifications", { method: "PUT" });
    setItems((p) => p.map((i) => ({ ...i, read: true })));
  };

  if (items.length === 0) {
    return (
      <div className="py-10 text-center">
        <Bell className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <p className="mt-3 font-bold text-muted-foreground">{t.dash.noNotifications}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">{t.dash.emptyNotifications}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-black">{t.dash.myNotifications}</h2>
        <button onClick={markAll} className="text-xs font-bold text-brand hover:underline">
          {t.dash.markAllRead}
        </button>
      </div>
      <div className="scroll-area max-h-96 space-y-3 overflow-y-auto pe-1">
        {items.map((n) => (
          <div
            key={n.id}
            className={
              "rounded-2xl border p-4 transition-colors " +
              (n.read ? "border-border bg-card" : "border-brand/35 bg-brand/5")
            }
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-extrabold">{lang === "ar" ? n.titleAr : n.titleFr}</p>
              {!n.read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" /> : null}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{lang === "ar" ? n.bodyAr : n.bodyFr}</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground/70">
                {new Date(n.createdAt).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {n.link ? (
                <Link href={n.link} className="text-[10px] font-bold text-brand hover:underline">
                  {t.common.readMore} →
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
