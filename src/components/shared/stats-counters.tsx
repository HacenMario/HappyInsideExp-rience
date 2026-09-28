"use client";

import React, { useEffect, useRef, useState } from "react";
import { Users, Armchair, Star, CalendarDays } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface StatsData {
  totalSeats: number;
  registered: number;
  seatsLeft: number;
  speakers: number;
  fillPercent: number;
}

function useCountUp(target: number, duration = 1400, start = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return value;
}

function StatCard({
  icon,
  value,
  label,
  suffix,
  color,
  start,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  suffix?: string;
  color: string;
  start: boolean;
}) {
  const animated = useCountUp(value, 1400, start);
  return (
    <div className="card-glow group relative overflow-hidden p-5 text-center sm:p-6">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" style={{ background: color }}>
        {icon}
      </div>
      <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        {animated}
        {suffix ? <span className="text-lg text-muted-foreground">{suffix}</span> : null}
      </p>
      <p className="mt-1 text-xs font-bold text-muted-foreground sm:text-sm">{label}</p>
    </div>
  );
}

export default function StatsCounters({ className }: { className?: string }) {
  const { t } = useLang();
  const [data, setData] = useState<StatsData | null>(null);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        const d = await res.json();
        if (alive) setData(d);
      } catch {}
    };
    load();
    const iv = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const stats = [
    {
      icon: <Users className="h-5 w-5" />,
      value: data?.registered ?? 0,
      label: t.stats.registered,
      color: "linear-gradient(135deg, oklch(0.66 0.17 42), oklch(0.72 0.16 35))",
    },
    {
      icon: <Armchair className="h-5 w-5" />,
      value: data?.seatsLeft ?? 0,
      label: t.stats.seatsLeft,
      color: "linear-gradient(135deg, oklch(0.62 0.12 175), oklch(0.66 0.1 165))",
    },
    {
      icon: <Star className="h-5 w-5" />,
      value: data?.speakers ?? 0,
      label: t.stats.speakers,
      color: "linear-gradient(135deg, oklch(0.78 0.14 80), oklch(0.74 0.15 70))",
    },
    {
      icon: <CalendarDays className="h-5 w-5" />,
      value: 4,
      label: `${t.stats.days} × 5 ${t.common.nights}`,
      color: "linear-gradient(135deg, oklch(0.55 0.1 25), oklch(0.6 0.12 30))",
    },
  ];

  return (
    <div ref={ref} className={cn("w-full", className)}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} style={{ animationDelay: `${i * 90}ms` }} className="reveal-up">
            <StatCard {...s} start={inView} />
          </div>
        ))}
      </div>
    </div>
  );
}
