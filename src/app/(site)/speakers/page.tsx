"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useLang } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Microscope } from "lucide-react";

interface Speaker {
  _id: string;
  name: string;
  nameAr: string;
  titleAr: string;
  titleFr: string;
  bioAr: string;
  bioFr: string;
  activityAr: string;
  activityFr: string;
  photo: string | null;
}

export default function SpeakersPage() {
  const { t, lang } = useLang();
  const [speakers, setSpeakers] = useState<Speaker[] | null>(null);

  useEffect(() => {
    fetch("/api/speakers")
      .then((r) => r.json())
      .then((d) => setSpeakers(d.speakers || []))
      .catch(() => setSpeakers([]));
  }, []);

  return (
    <div className="hero-mesh relative min-h-[70vh] py-12">
      <div className="blob start-[6%] top-16 h-48 w-48 bg-brand/30" />
      <div className="blob end-[8%] top-40 h-56 w-56 bg-brand-2/30" style={{ animationDelay: "-5s" }} />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="mb-3 border-brand/40 bg-brand/5 font-bold text-brand">
            <Sparkles className="me-1 h-3.5 w-3.5" /> {t.speakersPage.presenting}
          </Badge>
          <h1 className="section-line mx-auto text-3xl font-black sm:text-4xl">{t.speakersPage.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t.speakersPage.subtitle}</p>
        </div>

        {speakers === null ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-[1.5rem] border border-border bg-card p-6">
                <div className="shimmer mx-auto h-40 w-40 rounded-full" />
                <div className="shimmer mx-auto mt-5 h-5 w-36 rounded-full" />
                <div className="shimmer mx-auto mt-3 h-3 w-full rounded-full" />
                <div className="shimmer mx-auto mt-2 h-3 w-4/5 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {speakers.map((s, i) => (
              <Card key={s._id} className="card-glow overflow-hidden border-0" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="relative bg-gradient-to-b from-brand/15 via-brand-3/10 to-transparent pt-8">
                  <div className="relative mx-auto h-40 w-40">
                    {s.photo ? (
                      <Image
                        src={s.photo}
                        alt={s.name}
                        width={320}
                        height={320}
                        className="h-40 w-40 rounded-full border-4 border-white object-cover shadow-xl dark:border-card"
                      />
                    ) : (
                      <div className="flex h-40 w-40 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-brand/20 via-brand-3/20 to-brand-2/20 text-6xl font-black text-brand shadow-xl dark:border-card">
                        {s.name.charAt(0)}
                      </div>
                    )}
                    <span className="absolute -bottom-2 start-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand to-brand-2 px-3 py-1 text-[10px] font-black text-white shadow-lg rtl:translate-x-1/2">
                      {t.edition}
                    </span>
                  </div>
                </div>
                <CardContent className="p-6 pt-5 text-center">
                  <h2 className="text-lg font-black">{s.name}</h2>
                  <p className="text-sm font-bold text-brand">{lang === "ar" ? s.nameAr : ""}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {lang === "ar" ? s.titleAr : s.titleFr}
                  </p>

                  <div className="mt-4 rounded-2xl border border-brand-2/25 bg-brand-2/5 p-3.5 text-start">
                    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase text-brand-2">
                      <Microscope className="h-3.5 w-3.5" /> {t.speakersPage.activity}
                    </p>
                    <p className="text-sm font-semibold leading-relaxed">
                      {lang === "ar" ? s.activityAr : s.activityFr}
                    </p>
                  </div>

                  <div className="mt-3 text-start">
                    <p className="mb-1 text-[11px] font-black uppercase text-muted-foreground">{t.speakersPage.bio}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {lang === "ar" ? s.bioAr : s.bioFr}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
