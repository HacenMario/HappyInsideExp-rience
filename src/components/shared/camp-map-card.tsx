"use client";

import React from "react";
import { MapPin, Navigation, CalendarDays } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/* ============================================================
 * CampMapCard (Task 21) — Google Maps card showing the exact camp
 * location. The admin sets the pin from the admin settings (manual
 * pick on the map or "detect my location"); before that the card
 * falls back to a text search for the camp location.
 * The "فتح في خرائط Google" button uses the universal maps URL,
 * which opens the Google Maps app on mobile.
 * ============================================================ */

export default function CampMapCard({
  coords,
  locationLabel,
  datesLabel,
  compact = false,
  className,
}: {
  coords: { lat: number; lng: number } | null;
  locationLabel: string;
  datesLabel?: string;
  compact?: boolean; // smaller variant used inside the contact page
  className?: string;
}) {
  const { t, lang } = useLang();
  const m = t.map;

  const query = coords
    ? `${coords.lat},${coords.lng}`
    : "Zemmouri, Boumerdès, Algérie";
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${coords ? 15 : 12}&output=embed&hl=${lang === "ar" ? "ar" : "fr"}`;
  const openUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div className={cn("overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-lg", className)}>
      {/* header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-brand/10 via-brand-3/10 to-brand-2/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white shadow-md">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-black sm:text-base">{m.title}</h3>
            <p className="text-[11px] font-semibold text-muted-foreground">{m.subtitle}</p>
          </div>
        </div>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[11px] font-black text-white shadow-md shadow-brand/30 transition-transform hover:scale-[1.04]"
        >
          <Navigation className="h-3.5 w-3.5" />
          {m.openInMaps}
        </a>
      </div>

      {/* embedded map */}
      <div className={cn("map-card-frame m-3", compact ? "h-64" : "h-72 sm:h-80")} style={{ borderRadius: "1.25rem" }}>
        <iframe
          src={embedSrc}
          title={m.embedTitle}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* location footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-4">
        <p className="flex items-center gap-1.5 text-xs font-black text-brand-2">
          <MapPin className="h-3.5 w-3.5" />
          {locationLabel}
        </p>
        {datesLabel ? (
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-brand" />
            {datesLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
