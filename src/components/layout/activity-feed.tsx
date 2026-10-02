"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { GraduationCap, Briefcase, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
 * LIVE ACTIVITY POPUPS (social proof — Task 18)
 * - Elegant glass popup, bottom-center (never covers the two
 *   floating corner bubbles which sit ≥76px above the bottom).
 * - Appears at comfortable intervals (first ~8s, then 28-55s),
 *   auto-closes after exactly 10s with a thin timer bar.
 * - Politeness rules: max 6 per session, paused while the tab is
 *   hidden, instantly hidden on /admin, manual close = longer
 *   pause (60s), never blocks clicks (pointer-events on card only).
 * - Clicking the card opens the registration page (conversion).
 * ============================================================ */

interface ActivityItem {
  id: string;
  name: string;
  accountType: "student" | "specialist";
  wilaya: string;
  wilayaFr?: string;
  seat: number;
  createdAt: string;
}

const AUTO_CLOSE_MS = 10_000;
const FIRST_DELAY_MS = 8_000;
const NEXT_MIN_MS = 28_000;
const NEXT_RANGE_MS = 27_000;
const AFTER_MANUAL_MS = 60_000;
const MAX_PER_SESSION = 6;

function timeAgo(iso: string, lang: "ar" | "fr"): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 0) return lang === "ar" ? "قبل لحظات" : "à l'instant";
  const m = Math.floor(diff / 60_000);
  if (m < 1) return lang === "ar" ? "قبل لحظات" : "à l'instant";
  if (m < 60) return lang === "ar" ? `قبل ${m} ${m === 1 ? "دقيقة" : "دقائق"}` : `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === "ar" ? `قبل ${h} ${h === 1 ? "ساعة" : "ساعات"}` : `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return lang === "ar" ? "أمس" : "hier";
  if (d < 7) return lang === "ar" ? `قبل ${d} أيام` : `il y a ${d} jours`;
  return lang === "ar" ? "مؤخراً" : "récemment";
}

export default function ActivityFeed() {
  const { t, lang } = useLang();
  const pathname = usePathname();
  const [visible, setVisible] = useState<ActivityItem | null>(null);
  const [closing, setClosing] = useState(false);

  const itemsRef = useRef<ActivityItem[]>([]);
  const cursorRef = useRef(0);
  const shownRef = useRef(0);
  const visibleRef = useRef<ActivityItem | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAdminRef = useRef(false);
  const closeRef = useRef<(manual: boolean) => void>(() => {});

  /* keep the "admin page" flag fresh for the scheduler timers */
  useEffect(() => {
    isAdminRef.current = pathname?.startsWith("/admin") ?? false;
  }, [pathname]);

  /* fetch the live registrations (and refresh every minute) */
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/activity/recent", { cache: "no-store" });
        const data = await res.json();
        if (alive && Array.isArray(data.items)) itemsRef.current = data.items;
      } catch {}
    };
    load();
    pollRef.current = setInterval(load, 60_000);
    return () => {
      alive = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  /* popup scheduler loop — all timing logic lives here (no mutual
     use-before-declare between hooks) */
  useEffect(() => {
    const clearTimers = () => {
      for (const id of timersRef.current) clearTimeout(id);
      timersRef.current = [];
    };
    const later = (fn: () => void, ms: number) => {
      timersRef.current.push(setTimeout(fn, ms));
    };

    const scheduleNext = (delayMs: number) => {
      clearTimers();
      later(() => {
        if (isAdminRef.current) {
          scheduleNext(15_000);
          return;
        }
        if (document.hidden) {
          scheduleNext(10_000);
          return;
        }
        const list = itemsRef.current;
        if (!list.length || shownRef.current >= MAX_PER_SESSION) return;
        const item = list[cursorRef.current % list.length];
        cursorRef.current++;
        shownRef.current++;
        visibleRef.current = item;
        setVisible(item);
        later(() => close(false), AUTO_CLOSE_MS);
      }, delayMs);
    };

    /** close the current popup; manual closes get a longer pause */
    const close = (manual: boolean) => {
      if (!visibleRef.current) return;
      setClosing(true);
      later(() => {
        visibleRef.current = null;
        setVisible(null);
        setClosing(false);
        scheduleNext(manual ? AFTER_MANUAL_MS : NEXT_MIN_MS + Math.floor(Math.random() * NEXT_RANGE_MS));
      }, 300);
    };
    closeRef.current = close;

    scheduleNext(FIRST_DELAY_MS);
    const onVis = () => {
      if (document.hidden) {
        if (visibleRef.current) close(false);
        clearTimers();
      } else if (!visibleRef.current) {
        scheduleNext(7_000);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearTimers();
    };
  }, []);

  /* never show on the admin dashboard */
  if (pathname?.startsWith("/admin")) return null;
  if (!visible) return null;

  const isStudent = visible.accountType === "student";
  const CatIcon = isStudent ? GraduationCap : Briefcase;

  return (
    <div
      className={cn(
        // horizontal centering is handled inside the popup-in/out keyframes
        // (transform translate(-50%) — do NOT add Tailwind -translate-x-1/2)
        "activity-popup fixed bottom-3.5 left-1/2 z-[64] w-[min(94vw,26rem)]",
        closing && "activity-popup-out"
      )}
      role="status"
      aria-live="polite"
    >
      <Link
        href="/register"
        className="activity-popup-card glass-strong group relative flex items-center gap-3 overflow-hidden rounded-2xl p-3 pe-9 shadow-2xl ring-1 ring-brand/25 transition-transform duration-300 hover:scale-[1.02]"
      >
        {/* avatar */}
        <span
          className={cn(
            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md",
            isStudent
              ? "bg-gradient-to-br from-brand to-brand-2"
              : "bg-gradient-to-br from-brand-2 to-destructive/80"
          )}
        >
          <CatIcon className="h-5 w-5" />
          <span className="absolute -end-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
          </span>
        </span>

        {/* texts */}
        <span className="min-w-0 flex-1 text-start">
          <span className="block truncate text-[13px] font-extrabold leading-tight">
            {visible.name}
            {(lang === "fr" && visible.wilayaFr ? visible.wilayaFr : visible.wilaya) ? (
              <span className="font-bold text-muted-foreground">
                {' '}— {lang === "fr" && visible.wilayaFr ? visible.wilayaFr : visible.wilaya}
              </span>
            ) : null}
            <span className={cn("ms-1.5 inline-flex items-center gap-0.5 align-middle text-[10px] font-black", isStudent ? "text-brand-2" : "text-brand")}>
              <CatIcon className="h-3 w-3" />
              {isStudent ? t.common.student : t.common.specialist}
            </span>
          </span>
          <span className="mt-0.5 block text-[11px] font-bold leading-snug text-muted-foreground">
            {t.activity.overline} · {timeAgo(visible.createdAt, lang)}
          </span>
        </span>

        {/* CTA */}
        <span className="activity-cta shrink-0 rounded-full bg-brand px-3 py-1.5 text-[11px] font-black text-white shadow-md transition-colors group-hover:bg-brand/90">
          {t.activity.cta}
        </span>
      </Link>

      {/* manual close */}
      <button
        onClick={() => closeRef.current(true)}
        aria-label={t.activity.close}
        className="absolute end-1.5 top-1.5 z-10 rounded-full bg-muted/70 p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>

      {/* 10s auto-close timer bar */}
      <span className="activity-timer absolute bottom-0 left-0 h-[3px] w-full rounded-b-2xl bg-gradient-to-r from-brand via-brand-3 to-brand-2 opacity-80" />
    </div>
  );
}
