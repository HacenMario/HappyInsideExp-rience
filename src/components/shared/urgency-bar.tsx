"use client";

import React from "react";
import Link from "next/link";
import { Flame, Hourglass, ListOrdered, Ticket } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/* ============================================================
 * SMART URGENCY BAR (Task 20)
 * Pure presentational component — zero extra fetching. The homepage
 * already holds `settings` + `stats`, so this bar derives everything
 * from props:
 *   - seats left ≤ 15 → amber scarcity message
 *   - seats left ≤ 5  → hot "last chance" message
 *   - seats full      → waitlist invitation
 *   - otherwise       → calm countdown to the camp start
 * Respects RTL/LTR, reduced-motion (CSS) and never blocks clicks.
 * ============================================================ */

interface UrgencyBarProps {
  registered: number;
  totalSeats: number;
  registrationOpen: boolean;
  startDate?: string; // ISO
}

const fmt = (s: string, v: Record<string, string | number>): string =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export default function UrgencyBar({
  registered,
  totalSeats,
  registrationOpen,
  startDate,
}: UrgencyBarProps) {
  const { t } = useLang();
  const u = t.urgency;

  const seatsLeft = Math.max(0, totalSeats - registered);
  const days = startDate
    ? Math.max(0, Math.ceil((new Date(startDate).getTime() - Date.now()) / 86_400_000))
    : null;

  /* -------- registration closed → calm neutral notice -------- */
  if (!registrationOpen) {
    return (
      <div className="mx-auto mb-4 flex max-w-4xl items-center justify-center gap-2 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-center text-sm font-bold text-muted-foreground">
        <Hourglass className="h-4 w-4 shrink-0" />
        {u.closed}
      </div>
    );
  }

  /* ---------------------- seats full → waitlist ---------------------- */
  if (seatsLeft <= 0) {
    return (
      <div className="mx-auto mb-4 flex max-w-4xl flex-col items-center justify-between gap-3 rounded-2xl border border-brand-2/40 bg-gradient-to-r from-brand-2/10 via-brand/10 to-brand-2/10 px-5 py-4 text-center sm:flex-row sm:text-start">
        <p className="text-sm font-black sm:text-base">{u.full}</p>
        <Link
          href="/register"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-2 px-5 py-2 text-xs font-black text-white shadow-md transition-transform hover:scale-[1.03]"
        >
          <ListOrdered className="h-4 w-4" />
          {u.waitlistCta}
        </Link>
      </div>
    );
  }

  /* -------------------- hot mode: ≤ 5 seats left -------------------- */
  if (seatsLeft <= 5) {
    return (
      <UrgencyShell
        tone="hot"
        icon={<Flame className="h-5 w-5 shrink-0" />}
        text={seatsLeft === 1 ? u.seatsLeftOne : fmt(u.lastSeats, { n: seatsLeft })}
        cta={u.cta}
        days={days}
      />
    );
  }

  /* ------------------- amber mode: ≤ 15 seats left ------------------- */
  if (seatsLeft <= 15) {
    return (
      <UrgencyShell
        tone="amber"
        icon={<Ticket className="h-5 w-5 shrink-0" />}
        text={fmt(u.seatsLeft, { n: seatsLeft, total: totalSeats })}
        cta={u.cta}
        days={days}
      />
    );
  }

  /* ----------------- calm default: countdown only ----------------- */
  if (days === null) return null;
  return (
    <UrgencyShell
      tone="calm"
      icon={<Hourglass className="h-5 w-5 shrink-0" />}
      text={days === 0 ? u.today : days === 1 ? u.oneDay : fmt(u.daysTo, { n: days })}
      cta={u.cta}
      days={days}
    />
  );
}

function UrgencyShell({
  tone,
  icon,
  text,
  cta,
  days,
}: {
  tone: "hot" | "amber" | "calm";
  icon: React.ReactNode;
  text: string;
  cta: string;
  days: number | null;
}) {
  const { t } = useLang();
  return (
    <div
      className={cn(
        "urgency-bar mx-auto mb-4 flex max-w-4xl flex-col items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-center sm:flex-row sm:text-start",
        tone === "hot" && "urgency-hot border-destructive/45 bg-gradient-to-r from-destructive/12 via-amber-500/10 to-destructive/12",
        tone === "amber" && "border-amber-500/45 bg-gradient-to-r from-amber-500/12 via-amber-400/8 to-amber-500/12",
        tone === "calm" && "border-brand-2/35 bg-gradient-to-r from-brand-2/8 via-brand/6 to-brand-2/8"
      )}
      role="status"
      aria-live="polite"
    >
      <p
        className={cn(
          "flex items-center gap-2.5 text-sm font-black sm:text-base",
          tone === "hot" && "text-destructive dark:text-red-400",
          tone === "amber" && "text-amber-600 dark:text-amber-400",
          tone === "calm" && "text-brand-2"
        )}
      >
        {icon}
        <span>{text}</span>
        {days !== null && days > 1 && tone !== "calm" ? (
          <span className="hidden text-xs font-bold text-muted-foreground sm:inline">
            · {fmt(t.urgency.daysTo, { n: days })}
          </span>
        ) : null}
      </p>
      <Link
        href="/register"
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2 text-xs font-black text-white shadow-md transition-transform hover:scale-[1.03]",
          tone === "hot" && "bg-destructive shadow-destructive/30",
          tone === "amber" && "bg-amber-500 shadow-amber-500/30",
          tone === "calm" && "bg-brand shadow-brand/30"
        )}
      >
        <Ticket className="h-4 w-4" />
        {cta}
      </Link>
    </div>
  );
}
