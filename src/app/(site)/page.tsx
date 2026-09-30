"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatsCounters from "@/components/shared/stats-counters";
import { SeatProgress } from "@/components/shared/seat-progress";
import Lightbox from "@/components/shared/lightbox";
import {
  Sparkles,
  MapPin,
  CalendarDays,
  MoonStar,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Megaphone,
  Pin,
  Users,
  MessageCircleQuestion,
  Tent,
  HeartHandshake,
  PartyPopper,
  Leaf,
  ImagePlus,
  ZoomIn,
} from "lucide-react";

interface CampSettings {
  sloganAr: string;
  sloganFr: string;
  descAr: string;
  descFr: string;
  startDate: string;
  endDate: string;
  locationAr: string;
  locationFr: string;
  totalSeats: number;
  heroImage?: string | null; // data URL — replaces /images/hero.png
  programImage1?: string | null; // data URL — camp poster
  programImage2?: string | null; // data URL — detailed program
}

interface Speaker {
  _id: string;
  name: string;
  nameAr: string;
  titleAr: string;
  titleFr: string;
  photo: string | null;
}

interface Announcement {
  _id: string;
  titleAr: string;
  titleFr: string;
  pinned: boolean;
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

/* BookCta — the "احجز مقعدك الآن" button used across the landing page.
   Logged-in users go straight to the camp registration card inside the
   dashboard ("تسجيلي" tab); visitors are sent to account creation first,
   and the register/login pages bring them back to that same card after
   (auto-)login. */
function BookCta({
  className,
  variant = "default",
  size = "lg",
  children,
}: {
  className?: string;
  variant?: "default" | "outline";
  size?: "default" | "lg" | "sm";
  children: React.ReactNode;
}) {
  const { user, loading } = useSession();
  const router = useRouter();
  const book = () => {
    if (loading) return; // session still resolving — ignore momentary clicks
    if (user) {
      router.push("/dashboard?tab=registration&book=1");
    } else {
      router.push("/register?redirect=booking");
    }
  };
  return (
    <Button
      size={size}
      variant={variant}
      onClick={book}
      className={className}
      aria-label={typeof children === "string" ? children : undefined}
    >
      {children}
    </Button>
  );
}

export default function LandingPage() {
  const { t, lang, dir } = useLang();
  const [settings, setSettings] = useState<CampSettings | null>(null);
  const [stats, setStats] = useState<{ registered: number; totalSeats: number } | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string; caption?: string } | null>(null);

  const loadCamp = React.useCallback(() => {
    fetch("/api/camp", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadCamp();
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats({ registered: d.registered, totalSeats: d.totalSeats }))
      .catch(() => {});
    fetch("/api/speakers")
      .then((r) => r.json())
      .then((d) => setSpeakers((d.speakers || []).slice(0, 3)))
      .catch(() => {});
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements((d.announcements || []).slice(0, 2)))
      .catch(() => {});
    // live-refresh the hero/program images when the admin updates the settings
    const handler = () => setTimeout(loadCamp, 50);
    window.addEventListener("camp-settings-updated", handler);
    return () => window.removeEventListener("camp-settings-updated", handler);
  }, [loadCamp]);

  const countdown = useCountdown(settings?.startDate || "2026-10-15T00:00:00.000Z");
  const slogan = settings ? (lang === "ar" ? settings.sloganAr : settings.sloganFr) : t.slogan;
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const heroSrc = settings?.heroImage || "/images/hero.png";
  const programPoster = settings?.programImage1 || "/images/program-poster.jpg";
  const programDetails = settings?.programImage2 || "/images/program-details.jpg";
  const programImages = [
    { src: programPoster, title: t.program.posterTitle, ratio: "aspect-[4/5]" },
    { src: programDetails, title: t.program.detailsTitle, ratio: "aspect-[2/3]" },
  ];

  const countdownBlocks = [
    { v: countdown.d, l: lang === "ar" ? "يوم" : "J" },
    { v: countdown.h, l: lang === "ar" ? "ساعة" : "H" },
    { v: countdown.m, l: lang === "ar" ? "دقيقة" : "Min" },
    { v: countdown.s, l: lang === "ar" ? "ثانية" : "Sec" },
  ];

  return (
    <div className="overflow-x-clip">
      {/* ============ HERO ============ */}
      <section className="hero-mesh relative">
        <div className="blob start-[8%] top-10 h-56 w-56 bg-brand/40" />
        <div className="blob end-[10%] top-32 h-64 w-64 bg-brand-2/40" style={{ animationDelay: "-6s" }} />
        <div className="grid-pattern absolute inset-0" />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pb-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            {/* Text side */}
            <div className="text-center lg:text-start">
              <div className="reveal-up mb-5 inline-flex items-center gap-2 rounded-full border border-brand/40 bg-card/70 px-4 py-1.5 text-xs font-extrabold text-brand shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                {t.hero.badge}
              </div>
              <h1 className="reveal-up text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl" style={{ animationDelay: "120ms" }}>
                {t.hero.title1}{" "}
                <span className="text-gradient italic">{t.hero.titleHighlight}</span>
              </h1>
              <p className="reveal-up mx-auto mt-4 max-w-xl text-base font-semibold text-brand-2 sm:text-lg lg:mx-0" style={{ animationDelay: "220ms" }}>
                “{slogan}”
              </p>
              <p className="reveal-up mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:mx-0" style={{ animationDelay: "300ms" }}>
                {t.hero.subtitle}
              </p>

              {/* Info chips */}
              <div className="reveal-up mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start" style={{ animationDelay: "380ms" }}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-bold shadow-sm ring-1 ring-border">
                  <CalendarDays className="h-4 w-4 text-brand" /> {t.hero.date}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-bold shadow-sm ring-1 ring-border">
                  <MoonStar className="h-4 w-4 text-brand-2" /> {t.hero.duration}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-bold shadow-sm ring-1 ring-border">
                  <MapPin className="h-4 w-4 text-brand-3" /> {t.hero.location}
                </span>
              </div>

              {/* CTAs */}
              <div className="reveal-up mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start" style={{ animationDelay: "460ms" }}>
                <BookCta
                  size="lg"
                  className="group relative overflow-hidden rounded-full px-8 text-base font-extrabold shadow-xl shadow-brand/30"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-500 group-hover:translate-x-full rtl:translate-x-full rtl:group-hover:-translate-x-full" />
                  <PartyPopper className="h-5 w-5" />
                  {t.hero.ctaRegister}
                </BookCta>
                <a href="#program">
                  <Button size="lg" variant="outline" className="rounded-full px-7 text-base font-bold">
                    {t.hero.ctaLearnMore}
                    <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </a>
              </div>

              {/* Countdown */}
              <div className="reveal-up mt-8 flex items-center justify-center gap-2.5 lg:justify-start" style={{ animationDelay: "540ms" }}>
                {countdownBlocks.map((b, i) => (
                  <React.Fragment key={i}>
                    <div className="flex min-w-16 flex-col items-center rounded-2xl border border-brand/25 bg-card/80 px-2.5 py-2 shadow-sm backdrop-blur">
                      <span className="text-xl font-black tabular-nums text-brand sm:text-2xl">
                        {String(b.v).padStart(2, "0")}
                      </span>
                      <span className="whitespace-nowrap text-[9px] font-bold uppercase text-muted-foreground">{b.l}</span>
                    </div>
                    {i < 3 ? <span className="text-lg font-black text-brand/50">·</span> : null}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Image side */}
            <div className="reveal-up relative" style={{ animationDelay: "300ms" }}>
              <div className="tilt-hover relative mx-auto max-w-xl">
                <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand/30 via-brand-3/20 to-brand-2/30 blur-2xl" />
                <div className="overflow-hidden rounded-[2rem] border-2 border-white/60 shadow-2xl dark:border-white/10">
                  {settings?.heroImage ? (
                    <img
                      src={heroSrc}
                      alt={t.hero.title1 + " " + t.hero.titleHighlight}
                      className="h-auto w-full object-cover"
                    />
                  ) : (
                    <Image
                      src="/images/hero.png"
                      alt={t.hero.title1 + " " + t.hero.titleHighlight}
                      width={1344}
                      height={768}
                      className="h-auto w-full object-cover"
                      priority
                    />
                  )}
                </div>
                {/* floating badges */}
                <div className="float-y absolute -bottom-5 start-4 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur sm:start-8">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15">
                      <Tent className="h-5 w-5 text-brand" />
                    </div>
                    <div>
                      <p className="text-xs font-black">{t.edition}</p>
                      <p className="text-[10px] text-muted-foreground">15-19 / 10 / 2026</p>
                    </div>
                  </div>
                </div>
                <div className="float-y absolute -top-4 end-4 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur" style={{ animationDelay: "-2.5s" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-2/15">
                      <Leaf className="h-5 w-5 text-brand-2" />
                    </div>
                    <div>
                      <p className="text-xs font-black">{lang === "ar" ? "عناية بالنفس" : "Soin de soi"}</p>
                      <p className="text-[10px] text-muted-foreground">{lang === "ar" ? "مهنية وإنسانية" : "professionnel & humain"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-14 flex justify-center">
            <a href="#stats" className="flex flex-col items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-brand">
              {t.hero.scroll}
              <ArrowDown className="h-4 w-4 animate-bounce" />
            </a>
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section id="stats" className="relative py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="section-line mx-auto text-2xl font-black sm:text-3xl">{t.stats.title}</h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t.stats.subtitle}</p>
          </div>
          <StatsCounters />
        </div>
      </section>

      {/* ============ SEATS / REGISTER ============ */}
      <section className="relative py-6 sm:py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="card-glow relative overflow-hidden p-6 sm:p-8">
            <div className="blob end-6 top-6 h-24 w-24 bg-brand/30" />
            <div className="mb-5 flex flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-between sm:text-start">
              <div>
                <h3 className="text-xl font-black sm:text-2xl">{t.campReg.title}</h3>
                <p className="text-sm text-muted-foreground">{t.campReg.subtitle}</p>
              </div>
              <BookCta
                size="lg"
                className="rounded-full px-7 font-extrabold shadow-lg shadow-brand/30"
              >
                {t.hero.ctaRegister} ✨
              </BookCta>
            </div>
            {stats ? (
              <SeatProgress registered={stats.registered} total={stats.totalSeats} />
            ) : (
              <div className="space-y-3">
                <div className="shimmer h-8 w-40 rounded-lg" />
                <div className="shimmer h-4 w-full rounded-full" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ PROGRAM ============ */}
      <section id="program" className="relative py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <Badge variant="outline" className="mb-3 border-brand/40 bg-brand/5 font-bold text-brand">
              🎯 {t.program.title}
            </Badge>
            <h2 className="section-line mx-auto text-2xl font-black sm:text-3xl">{t.program.title}</h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t.program.subtitle}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.program.items.map((item, i) => (
              <div
                key={i}
                className="card-glow group relative overflow-hidden p-5"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="absolute -end-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-brand/15 to-brand-2/15 transition-transform duration-500 group-hover:scale-[1.8]" />
                <div className="relative">
                  <span className="mb-3 inline-block rounded-2xl bg-muted px-3 py-2 text-3xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    {item.emoji}
                  </span>
                  <h3 className="mb-1.5 text-base font-extrabold leading-snug">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-brand via-brand-3 to-brand-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            ))}
            {/* CTA card inside program grid */}
            <div className="relative overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-brand via-brand-3 to-brand-2 p-5 text-white shadow-xl">
              <div className="blob start-4 top-4 h-20 w-20 bg-white/25" />
              <div className="relative flex h-full flex-col items-start justify-between gap-4">
                <div>
                  <HeartHandshake className="mb-3 h-9 w-9" />
                  <h3 className="text-lg font-black leading-snug">{slogan}</h3>
                  <p className="mt-2 text-sm opacity-90">{t.footer.about}</p>
                </div>
                <BookCta className="rounded-full bg-white font-extrabold text-brand hover:bg-white/90">
                  {t.hero.ctaRegister}
                  <Arrow className="h-4 w-4" />
                </BookCta>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PROGRAM IMAGES (poster + detailed schedule) ============ */}
      <section id="program-details" className="relative py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <Badge variant="outline" className="mb-3 border-brand-3/40 bg-brand-3/5 font-bold text-brand-3">
              <ImagePlus className="me-1.5 h-3.5 w-3.5" />
              {t.program.imagesTitle}
            </Badge>
            <h2 className="section-line mx-auto text-2xl font-black sm:text-3xl">{t.program.imagesTitle}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t.program.imagesSubtitle}
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {programImages.map((img, i) => (
              <div key={i} className="group">
                <button
                  type="button"
                  onClick={() => setLightbox({ src: img.src, alt: img.title, caption: img.title })}
                  className="card-glow relative block w-full overflow-hidden rounded-[1.5rem] border border-border p-0 text-start shadow-lg transition-shadow hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  aria-label={img.title + " — " + t.program.openFull}
                >
                  <div className={img.ratio + " relative w-full overflow-hidden bg-muted"}>
                    { }
                    <img
                      src={img.src}
                      alt={img.title}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-contain object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    {/* hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/35 group-hover:opacity-100">
                      <span className="flex items-center gap-2 rounded-full bg-white/95 px-5 py-2.5 text-sm font-black text-brand-2 shadow-xl">
                        <ZoomIn className="h-5 w-5" />
                        {t.program.openFull}
                      </span>
                    </div>
                    {/* always-visible caption bar (mobile has no hover) */}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <span className="text-sm font-black text-white drop-shadow">{img.title}</span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-colors group-hover:bg-brand">
                        <ZoomIn className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SPEAKERS ============ */}
      <section className="relative bg-muted/50 py-14 sm:py-20 dark:bg-card/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="section-line mx-auto text-2xl font-black sm:text-3xl">{t.speakersPage.title}</h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t.speakersPage.subtitle}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {speakers.length === 0
              ? [0, 1, 2].map((i) => (
                  <div key={i} className="rounded-[1.25rem] border border-border bg-card p-5">
                    <div className="shimmer mx-auto h-40 w-40 rounded-full" />
                    <div className="shimmer mx-auto mt-4 h-4 w-32 rounded-full" />
                    <div className="shimmer mx-auto mt-2 h-3 w-40 rounded-full" />
                  </div>
                ))
              : speakers.map((s) => (
                  <Link key={s._id} href="/speakers" className="group">
                    <div className="card-glow h-full p-6 text-center">
                      <div className="relative mx-auto h-36 w-36">
                        {s.photo ? (
                          <Image
                            src={s.photo}
                            alt={s.name}
                            width={288}
                            height={288}
                            className="h-36 w-36 rounded-full border-4 border-brand-3/60 object-cover shadow-lg transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-brand-3/60 bg-gradient-to-br from-brand/15 to-brand-2/15 text-4xl font-black text-brand shadow-lg transition-transform duration-300 group-hover:scale-105">
                            {s.name.charAt(0)}
                          </div>
                        )}
                        <span className="absolute -bottom-1 end-1 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-lg shadow-md">
                          ✨
                        </span>
                      </div>
                      <h3 className="mt-4 text-base font-black">{s.name}</h3>
                      <p className="text-xs font-bold text-muted-foreground">{lang === "ar" ? s.nameAr : ""}</p>
                      <p className="mt-1 text-xs text-brand-2">{lang === "ar" ? s.titleAr : s.titleFr}</p>
                    </div>
                  </Link>
                ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/speakers">
              <Button variant="outline" className="rounded-full font-bold">
                <Users className="h-4 w-4" />
                {t.common.showMore}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ============ ANNOUNCEMENTS PREVIEW ============ */}
      {announcements.length > 0 ? (
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mb-8 text-center">
              <h2 className="section-line mx-auto text-2xl font-black sm:text-3xl">{t.ann.latest}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {announcements.map((a) => (
                <Link key={a._id} href="/announcements">
                  <div className="card-glow flex h-full items-start gap-3 p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/15">
                      <Megaphone className="h-5 w-5 text-brand" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-extrabold leading-snug">
                        {a.pinned ? <Pin className="me-1 inline h-3.5 w-3.5 text-brand-3" /> : null}
                        {lang === "ar" ? a.titleAr : a.titleFr}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-brand">{t.common.readMore} →</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ============ FAQ PREVIEW + CTA ============ */}
      <section className="relative py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-2 via-brand-3 to-brand p-8 text-center text-white shadow-2xl sm:p-12">
            <div className="blob start-10 top-8 h-28 w-28 bg-white/20" />
            <div className="blob end-16 bottom-8 h-24 w-24 bg-white/15" style={{ animationDelay: "-4s" }} />
            <div className="relative">
              <MessageCircleQuestion className="mx-auto mb-4 h-12 w-12" />
              <h2 className="text-2xl font-black sm:text-3xl">{t.faq.title}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm opacity-90">{t.faq.subtitle}</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link href="/faq">
                  <Button className="rounded-full bg-white font-extrabold text-brand-2 hover:bg-white/90">
                    {t.nav.faq}
                  </Button>
                </Link>
                <BookCta
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/60 bg-white/10 px-7 font-extrabold text-white hover:bg-white/20"
                >
                  {t.hero.ctaRegister} ✨
                </BookCta>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-screen lightbox viewer (conditional mount = fresh zoom state) */}
      {lightbox ? (
        <Lightbox src={lightbox.src} alt={lightbox.alt} caption={lightbox.caption} onClose={() => setLightbox(null)} />
      ) : null}
    </div>
  );
}
