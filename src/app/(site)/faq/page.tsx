"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MessageCircleQuestion, Mail, HelpCircle } from "lucide-react";

interface Faq {
  _id: string;
  questionAr: string;
  questionFr: string;
  answerAr: string;
  answerFr: string;
}

export default function FaqPage() {
  const { t, lang } = useLang();
  const [faqs, setFaqs] = useState<Faq[] | null>(null);

  useEffect(() => {
    fetch("/api/faqs")
      .then((r) => r.json())
      .then((d) => setFaqs(d.faqs || []))
      .catch(() => setFaqs([]));
  }, []);

  return (
    <div className="relative min-h-[70vh] py-12">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-50" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-xl">
            <MessageCircleQuestion className="h-8 w-8" />
          </div>
          <h1 className="section-line mx-auto text-3xl font-black sm:text-4xl">{t.faq.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t.faq.subtitle}</p>
        </div>

        {faqs === null ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="shimmer h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <p className="text-center text-muted-foreground">{t.faq.empty}</p>
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={f._id}
                value={f._id}
                className="card-glow overflow-hidden rounded-2xl border-0 px-5"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <AccordionTrigger className="py-4 text-start text-sm font-extrabold hover:no-underline sm:text-base">
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-xs font-black text-brand">
                      {i + 1}
                    </span>
                    {lang === "ar" ? f.questionAr : f.questionFr}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 ps-10 text-sm leading-relaxed text-muted-foreground">
                  {lang === "ar" ? f.answerAr : f.answerFr}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        <div className="mt-10 rounded-[2rem] bg-gradient-to-r from-brand to-brand-2 p-7 text-center text-white shadow-xl">
          <HelpCircle className="mx-auto mb-3 h-9 w-9" />
          <h2 className="text-lg font-black">{t.faq.still}</h2>
          <Link href="/contact" className="mt-4 inline-block">
            <Button className="rounded-full bg-white font-extrabold text-brand hover:bg-white/90">
              <Mail className="h-4 w-4" /> {t.faq.contact}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
