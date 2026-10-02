"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { Megaphone, Pin, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarState {
  active: boolean;
  floating: boolean;
  textAr: string;
  textFr: string;
  link?: string;
}

const COPIES = 6; // enough copies so the 50% loop never shows a gap

/* Dismissal is persisted per announcement content: closing the bar keeps it
   closed across reloads/navigations, and it only comes back when the admin
   publishes a DIFFERENT text. */
function annKey(state: BarState) {
  const content = `${state.textAr}|${state.textFr}|${state.link || ""}`;
  let h = 5381;
  for (let i = 0; i < content.length; i++) h = ((h << 5) + h + content.charCodeAt(i)) >>> 0;
  return `hiex_ann_dism_${h.toString(36)}`;
}

export default function AnnouncementBar() {
  const { lang } = useLang();
  const [state, setState] = useState<BarState | null>(null);
  const [dismissed, setDismissed] = useState(true); // hidden until we know

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/camp", { cache: "no-store" });
        const data = await res.json();
        if (!alive || !data.settings) return;
        const next: BarState = {
          active: !!data.settings.announcementBarActive,
          floating: !!data.settings.announcementBarFloating,
          textAr: data.settings.announcementBarTextAr || "",
          textFr: data.settings.announcementBarTextFr || "",
          link: data.settings.announcementBarLink,
        };
        setState(next);
        let stored: string | null = null;
        try {
          stored = window.localStorage.getItem(annKey(next));
        } catch {}
        setDismissed(stored === "1");
      } catch {}
    };
    load();
    const iv = setInterval(load, 120000); // Task 19: gentler poll (edge-cached)
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    if (state) {
      try {
        window.localStorage.setItem(annKey(state), "1");
      } catch {}
    }
  };

  if (!state || !state.active || dismissed) return null;

  const text = lang === "ar" ? state.textAr : state.textFr;
  if (!text) return null;

  const body = (
    <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <Megaphone className="h-4 w-4 shrink-0 animate-pulse" />
        <div className="marquee-host relative min-w-0 flex-1 overflow-hidden">
          {/* News ticker: direction handled by CSS ([dir=rtl] reverses the animation) */}
          <div className="marquee-track text-xs font-bold sm:text-sm">
            {Array.from({ length: COPIES }).map((_, i) => (
              <span key={i} className="flex items-center" aria-hidden={i > 0}>
                <span className="px-6">{text}</span>
                <span className="opacity-60">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      {state.link ? (
        <Link
          href={state.link}
          className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold transition-colors hover:bg-white/30"
        >
          {lang === "ar" ? "سجّل الآن ←" : "S'inscrire →"}
        </Link>
      ) : null}
    </div>
  );

  const CloseBtn = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        dismiss();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={lang === "ar" ? "إغلاق الإعلان" : "Fermer l'annonce"}
      className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-lg ring-1 ring-border transition-transform hover:scale-110 active:scale-95"
    >
      <X className="h-4 w-4" />
    </button>
  );

  if (state.floating) {
    return (
      <div className="fixed bottom-20 end-4 z-[68] w-[calc(100vw-2rem)] max-w-md sm:end-6">
        <div className="relative rounded-2xl border border-brand/40 bg-gradient-to-r from-brand to-brand-3 text-white shadow-2xl">
          {/* Close button: placed INSIDE the flow (flex header row) so it can
              never be pushed off-screen or covered by other UI — always clickable.
              NOTE: z-10 on the WRAPPER is essential — the header row has
              opacity-90 which creates a z:0 stacking context that would
              otherwise paint ABOVE a z-auto positioned element. */}
          <div className="absolute -top-3.5 end-3 z-10">
            {CloseBtn}
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 pe-14 text-[11px] font-extrabold uppercase opacity-90">
            <Pin className="h-3 w-3" />
            {lang === "ar" ? "إعلان عائم" : "Annonce flottante"}
          </div>
          {body}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative z-[45] w-full bg-gradient-to-r from-brand via-brand-3 to-brand-2 text-white shadow-md"
      )}
    >
      <div className="pe-12">
        {body}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          dismiss();
        }}
        aria-label={lang === "ar" ? "إغلاق الإعلان" : "Fermer l'annonce"}
        className="absolute end-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-white/20 sm:flex"
      >
        <X className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}
