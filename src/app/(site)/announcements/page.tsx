"use client";

import React, { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Pin, CalendarDays, MegaphoneOff } from "lucide-react";

interface Announcement {
  _id: string;
  titleAr: string;
  titleFr: string;
  bodyAr: string;
  bodyFr: string;
  pinned: boolean;
  createdAt: string;
}

export default function AnnouncementsPage() {
  const { t, lang } = useLang();
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/announcements", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setAnnouncements(d.announcements || []))
        .catch(() => {});
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="relative min-h-[70vh] py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="section-line mx-auto text-3xl font-black sm:text-4xl">{t.ann.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t.ann.subtitle}</p>
        </div>

        {announcements === null ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-[1.25rem] border border-border bg-card p-6">
                <div className="shimmer h-5 w-2/3 rounded-full" />
                <div className="shimmer mt-4 h-3 w-full rounded-full" />
                <div className="shimmer mt-2 h-3 w-4/5 rounded-full" />
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="mx-auto max-w-md rounded-[2rem] border border-dashed border-brand/40 bg-card p-10 text-center">
            <MegaphoneOff className="mx-auto h-14 w-14 text-brand/50" />
            <p className="mt-4 font-bold text-muted-foreground">{t.ann.empty}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {announcements.map((a, i) => (
              <Card
                key={a._id}
                className="card-glow border-0"
                style={{ animationDelay: `${Math.min(i, 6) * 70}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md " +
                        (a.pinned
                          ? "bg-gradient-to-br from-brand to-brand-3 text-white"
                          : "bg-brand/15 text-brand")
                      }
                    >
                      {a.pinned ? <Pin className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-black leading-snug sm:text-lg">
                          {lang === "ar" ? a.titleAr : a.titleFr}
                        </h2>
                        {a.pinned ? (
                          <Badge className="bg-brand-3/20 text-[10px] font-black text-brand-3">
                            <Pin className="me-1 h-3 w-3" />
                            {t.ann.pinned}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {t.ann.publishedOn}{" "}
                        {new Date(a.createdAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <div className="mt-3 whitespace-pre-line rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed">
                        {lang === "ar" ? a.bodyAr : a.bodyFr}
                      </div>
                    </div>
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
