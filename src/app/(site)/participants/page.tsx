"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Building2, UserPlus, Venus, Mars } from "lucide-react";

interface Participant {
  registrationId: string;
  fullName: string;
  gender: "male" | "female";
  wilaya: string;
  workplace: string;
  bio: string;
  avatar: string | null;
  joinedAt: string;
}

export default function ParticipantsPage() {
  const { t, lang } = useLang();
  const [data, setData] = useState<{ participants: Participant[]; males: number; females: number; total: number } | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/participants", { cache: "no-store" })
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="relative min-h-[70vh] py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="section-line mx-auto text-3xl font-black sm:text-4xl">{t.participants.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t.participants.subtitle}</p>
        </div>

        {/* Summary chips */}
        {data ? (
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2.5">
            <Badge className="bg-brand px-4 py-1.5 text-sm font-extrabold text-white shadow-md">
              <Users className="me-1.5 h-4 w-4" />
              {data.total} {data.total === 1 ? t.participants.participant : t.participants.participants}
            </Badge>
            <Badge variant="outline" className="border-brand/40 bg-brand/5 px-4 py-1.5 text-sm font-bold text-brand">
              <Venus className="me-1.5 h-4 w-4" /> {data.females} {t.participants.femaleCount}
            </Badge>
            <Badge variant="outline" className="border-brand-2/40 bg-brand-2/5 px-4 py-1.5 text-sm font-bold text-brand-2">
              <Mars className="me-1.5 h-4 w-4" /> {data.males} {t.participants.maleCount}
            </Badge>
          </div>
        ) : null}

        {data === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-[1.25rem] border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="shimmer h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="shimmer h-4 w-3/4 rounded-full" />
                    <div className="shimmer h-3 w-1/2 rounded-full" />
                  </div>
                </div>
                <div className="shimmer mt-4 h-3 w-full rounded-full" />
                <div className="shimmer mt-2 h-3 w-2/3 rounded-full" />
              </div>
            ))}
          </div>
        ) : data.participants.length === 0 ? (
          <div className="mx-auto max-w-md rounded-[2rem] border border-dashed border-brand/40 bg-card p-10 text-center">
            <Users className="mx-auto h-14 w-14 text-brand/50" />
            <p className="mt-4 text-lg font-bold">{t.participants.noParticipants}</p>
            <Link href="/register" className="mt-5 inline-block">
              <Button className="rounded-full font-extrabold shadow-lg shadow-brand/25">
                <UserPlus className="h-4 w-4" /> {t.participants.registerCta}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.participants.map((p, i) => (
              <Card key={p.registrationId} className="card-glow border-0" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3.5">
                    {p.avatar ? (
                      <Image
                        src={p.avatar}
                        alt={p.fullName}
                        width={112}
                        height={112}
                        className="h-14 w-14 rounded-full border-2 border-brand-3/60 object-cover shadow-md"
                      />
                    ) : (
                      <div
                        className={
                          "flex h-14 w-14 items-center justify-center rounded-full border-2 text-xl font-black shadow-md " +
                          (p.gender === "female"
                            ? "border-brand/50 bg-brand/15 text-brand"
                            : "border-brand-2/50 bg-brand-2/15 text-brand-2")
                        }
                      >
                        {p.fullName.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold">{p.fullName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.participants.joinedOn}{" "}
                        {new Date(p.joinedAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <span
                        className={
                          "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold " +
                          (p.gender === "female" ? "bg-brand/15 text-brand" : "bg-brand-2/15 text-brand-2")
                        }
                      >
                        {p.gender === "female" ? <Venus className="h-3 w-3" /> : <Mars className="h-3 w-3" />}
                        {p.gender === "female" ? t.common.female : t.common.male}
                      </span>
                    </div>
                  </div>
                  {(p.wilaya || p.workplace) ? (
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {p.wilaya ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold">
                          <MapPin className="h-3 w-3 text-brand" /> {p.wilaya}
                        </span>
                      ) : null}
                      {p.workplace ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold">
                          <Building2 className="h-3 w-3 text-brand-2" /> {p.workplace}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {p.bio ? (
                    <p className="mt-3 line-clamp-3 rounded-xl bg-muted/60 p-2.5 text-xs leading-relaxed text-muted-foreground">
                      {p.bio}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
