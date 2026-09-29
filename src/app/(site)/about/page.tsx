"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useLang } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Eye, HeartHandshake, CalendarDays, MoonStar, MapPin } from "lucide-react";

export default function AboutPage() {
  const { t, lang } = useLang();
  const [settings, setSettings] = useState<{
    descAr: string;
    descFr: string;
    locationAr: string;
    locationFr: string;
    startDate: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/camp")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch(() => {});
  }, []);

  const desc = settings ? (lang === "ar" ? settings.descAr : settings.descFr) : "";
  const location = settings ? (lang === "ar" ? settings.locationAr : settings.locationFr) : "";

  return (
    <div className="relative min-h-[70vh] py-12">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-60" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="section-line mx-auto text-3xl font-black sm:text-4xl">{t.about.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t.about.subtitle}</p>
        </div>

        {/* Hero image */}
        <div className="reveal-up relative mx-auto mb-10 max-w-3xl">
          <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-br from-brand/25 to-brand-2/25 blur-xl" />
          <Image
            src="/images/hero.png"
            alt="Happy inside expérience"
            width={1344}
            height={768}
            className="w-full rounded-[2rem] border-2 border-white/60 object-cover shadow-2xl dark:border-white/10"
          />
        </div>

        {/* Description */}
        <Card className="card-glow mb-6 border-0 p-0">
          <CardContent className="p-7 sm:p-9">
            <p className="text-lg font-black">{t.slogan}</p>
            <div className="mt-4 space-y-4 text-sm leading-loose text-muted-foreground sm:text-base">
              <p>{t.about.p1}</p>
              <p>{t.about.p2}</p>
              <p>{t.about.p3}</p>
              {desc ? (
                <p className="rounded-2xl border border-brand/25 bg-brand/5 p-4 font-semibold text-foreground">{desc}</p>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-bold shadow-sm ring-1 ring-border">
                <CalendarDays className="h-4 w-4 text-brand" /> 15 - 19 / 10 / 2026
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-bold shadow-sm ring-1 ring-border">
                <MoonStar className="h-4 w-4 text-brand-2" /> {t.hero.duration}
              </span>
              {location ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-xs font-bold shadow-sm ring-1 ring-border">
                  <MapPin className="h-4 w-4 text-brand-3" /> {location}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Mission / Vision / Values */}
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="card-glow border-0">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-3 text-white shadow-lg">
                <Target className="h-7 w-7" />
              </div>
              <h2 className="text-base font-black">{t.about.missionTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.about.mission}</p>
            </CardContent>
          </Card>
          <Card className="card-glow border-0">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-2 to-brand text-white shadow-lg">
                <Eye className="h-7 w-7" />
              </div>
              <h2 className="text-base font-black">{t.about.visionTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.about.vision}</p>
            </CardContent>
          </Card>
          <Card className="card-glow border-0">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-3 to-brand text-white shadow-lg">
                <HeartHandshake className="h-7 w-7" />
              </div>
              <h2 className="text-base font-black">{t.about.valuesTitle}</h2>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {t.about.values.map((v) => (
                  <Badge key={v} variant="outline" className="border-brand/35 bg-brand/5 text-[11px] font-bold text-brand">
                    {v}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
