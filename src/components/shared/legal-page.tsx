"use client";

import React from "react";
import { useLang } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, ScrollText } from "lucide-react";

export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { t } = useLang();
  const data = kind === "privacy" ? t.privacy : t.terms;
  const Icon = kind === "privacy" ? ShieldCheck : ScrollText;

  return (
    <div className="relative min-h-[70vh] py-12">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-40" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-2 to-brand text-white shadow-xl">
            <Icon className="h-8 w-8" />
          </div>
          <h1 className="section-line mx-auto text-3xl font-black sm:text-4xl">{data.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{data.subtitle}</p>
        </div>

        <div className="space-y-4">
          {data.sections.map((s, i) => (
            <Card key={i} className="card-glow border-0">
              <CardContent className="flex items-start gap-4 p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-sm font-black text-white shadow-md">
                  {i + 1}
                </span>
                <div>
                  <h2 className="text-base font-black">{s.h}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.p}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
