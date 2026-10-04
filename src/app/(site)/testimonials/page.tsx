"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Quote, MapPin, GraduationCap, Briefcase, MessageSquareHeart, PartyPopper, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
 * /testimonials (Task 21) — "آراء المشاركين في المخيم"
 * Elegant public page showing the opinions that the admin
 * documented for camp participants. AR/FR, RTL/LTR, responsive.
 * ============================================================ */

interface Testimonial {
  id: string;
  name: string;
  accountType: "student" | "specialist";
  wilaya: string;
  rating: number;
  textAr: string;
  textFr: string;
  avatar: string | null;
  createdAt: string;
}

function Stars({ n, size = "h-4 w-4" }: { n: number; size?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(size, "testimonial-star", i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35")}
        />
      ))}
    </span>
  );
}

export default function TestimonialsPage() {
  const { t, lang } = useLang();
  const ts = t.testimonials;
  const [items, setItems] = useState<Testimonial[] | null>(null);
  const [avg, setAvg] = useState(0);

  useEffect(() => {
    fetch("/api/testimonials")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.testimonials || []);
        setAvg(d.avg || 0);
      })
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="relative min-h-[75vh] py-10">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-40" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ===== header ===== */}
        <div className="mb-10 text-center">
          <Badge className="mb-3 border-brand-3/40 bg-brand-3/10 px-3.5 py-1.5 text-xs font-black text-brand-3">
            <MessageSquareHeart className="me-1.5 h-3.5 w-3.5" />
            {ts.badge}
          </Badge>
          <h1 className="text-2xl font-black sm:text-3xl">{ts.title}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{ts.subtitle}</p>

          {/* rating summary */}
          {items && items.length > 0 && avg > 0 ? (
            <div className="mx-auto mt-6 inline-flex items-center gap-4 rounded-3xl border border-amber-400/40 bg-gradient-to-r from-amber-400/10 via-amber-300/5 to-amber-400/10 px-6 py-3.5 shadow-sm">
              <p className="text-3xl font-black tabular-nums text-amber-500" dir="ltr">
                {avg.toFixed(1)}
              </p>
              <div className="text-start">
                <Stars n={Math.round(avg)} />
                <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">
                  {lang === "ar" ? `من ${items.length} مشارك/ة شاركوا رأيهم` : `basé sur ${items.length} avis de participants`}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* ===== grid ===== */}
        {items === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="shimmer h-52 rounded-3xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-[2rem] border border-dashed border-border bg-card/60 p-12 text-center">
            <MessageSquareHeart className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-base font-black">{ts.emptyTitle}</p>
            <p className="mt-2 text-sm text-muted-foreground">{ts.emptyDesc}</p>
            <Link href="/register" className="mt-6 inline-block">
              <Button className="rounded-full px-6 font-extrabold shadow-lg shadow-brand/30">
                <Sparkles className="h-4 w-4" />
                {ts.emptyCta}
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((x, i) => {
                const isStudent = x.accountType === "student";
                const CatIcon = isStudent ? GraduationCap : Briefcase;
                const text = lang === "fr" && x.textFr ? x.textFr : x.textAr;
                return (
                  <article
                    key={x.id}
                    className="testimonial-card card-glow relative flex flex-col overflow-hidden rounded-3xl p-5"
                    style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                  >
                    <span className="testimonial-quote-mark" aria-hidden="true">
                      ”
                    </span>
                    <Stars n={x.rating} />
                    <p className="relative mt-3 flex-1 text-sm leading-relaxed text-foreground/90">{text}</p>

                    <div className="mt-4 flex items-center gap-3 border-t border-border/60 pt-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand/25 to-brand-2/25 text-base font-black text-brand shadow-inner">
                        {x.avatar ? (
                          <img src={x.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          x.name.trim().charAt(0)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{x.name}</p>
                        <p className="flex flex-wrap items-center gap-x-1.5 text-[10px] font-bold text-muted-foreground">
                          <span className={cn("inline-flex items-center gap-0.5", isStudent ? "text-brand-2" : "text-brand")}>
                            <CatIcon className="h-3 w-3" />
                            {isStudent ? t.common.student : t.common.specialist}
                          </span>
                          {x.wilaya ? (
                            <span className="inline-flex items-center gap-0.5">
                              · <MapPin className="h-2.5 w-2.5" /> {x.wilaya}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* closing CTA */}
            <div className="relative mt-12 overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-2 via-brand-3 to-brand p-8 text-center text-white shadow-2xl sm:p-10">
              <div className="blob start-10 top-8 h-28 w-28 bg-white/20" />
              <div className="relative">
                <PartyPopper className="mx-auto mb-3 h-10 w-10" />
                <h2 className="text-xl font-black sm:text-2xl">{ts.ctaTitle}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm opacity-90">{ts.ctaDesc}</p>
                <Link href="/register" className="mt-5 inline-block">
                  <Button className="rounded-full bg-white px-7 font-extrabold text-brand-2 shadow-xl hover:bg-white/90">
                    <Sparkles className="h-4 w-4" />
                    {ts.ctaButton}
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}

        {/* moderation note */}
        {items && items.length > 0 ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-[11px] font-semibold leading-relaxed text-muted-foreground">
            {ts.note}
          </p>
        ) : null}
      </div>
    </div>
  );
}
