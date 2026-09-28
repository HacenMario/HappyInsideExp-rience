"use client";

import React, { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function SeatProgress({ registered, total, className }: { registered: number; total: number; className?: string }) {
  const { t } = useLang();
  const [animated, setAnimated] = useState(0);
  const pct = total > 0 ? Math.min(100, Math.round((registered / total) * 100)) : 0;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(pct), 150);
    return () => clearTimeout(timer);
  }, [pct]);

  const seatsLeft = Math.max(0, total - registered);
  const urgency = seatsLeft === 0 ? "full" : pct >= 80 ? "high" : pct >= 50 ? "mid" : "low";

  const barColor =
    urgency === "full"
      ? "from-destructive to-destructive/80"
      : urgency === "high"
        ? "from-brand to-destructive"
        : urgency === "mid"
          ? "from-brand-3 to-brand"
          : "from-brand-2 to-brand";

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-muted-foreground">{t.campReg.seatsProgress}</p>
          <p className="text-2xl font-extrabold leading-tight">
            {registered}
            <span className="text-sm font-bold text-muted-foreground"> / {total}</span>
          </p>
        </div>
        <div className="text-end">
          <p className="text-xs font-bold text-muted-foreground">{t.stats.filledPercent}</p>
          <p className={cn("text-2xl font-extrabold leading-tight", urgency === "high" || urgency === "full" ? "text-destructive" : "text-brand")}>
            {pct}%
          </p>
        </div>
      </div>
      <div className="progress-shimmer h-4 w-full overflow-hidden rounded-full bg-muted shadow-inner">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out", barColor)}
          style={{ width: `${animated}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-bold text-brand-2">
          {seatsLeft > 0 ? `${seatsLeft} ${t.common.seatsLeft}` : t.campReg.full}
        </span>
        {urgency === "high" ? (
          <span className="animate-pulse font-bold text-destructive">🔥 {t.campReg.lastSeats}</span>
        ) : urgency === "mid" ? (
          <span className="font-bold text-brand-3">⚡ {t.campReg.hurry}</span>
        ) : null}
      </div>
    </div>
  );
}
