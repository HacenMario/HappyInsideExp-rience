"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Crosshair, Loader2, MapPin, Trash2 } from "lucide-react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";

/* ============================================================
 * MapPicker (Task 21) — admin camp-location picker.
 * • Click anywhere on the map to drop the camp pin (manual pick)
 * • "حدد موقعي" uses the browser geolocation API
 * • The pin is stored as mapLat/mapLng in the camp settings and
 *   drives every Google Maps card/link on the public site.
 * Uses Leaflet + OpenStreetMap tiles for PICKING only (no API key
 * needed); the public display uses Google Maps embeds.
 * ============================================================ */

/* Default view: Zemmouri, Boumerdès (the camp region) */
const DEFAULT_CENTER: [number, number] = [36.816, 3.866];
const DEFAULT_ZOOM = 12;

export default function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null | undefined;
  lng: number | null | undefined;
  onChange: (lat: number | null, lng: number | null) => void;
}) {
  const { t, lang } = useLang();
  const m = t.map;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const markerRef = useRef<LeafletNS.Marker | null>(null);
  const leafletRef = useRef<typeof LeafletNS | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* init map once */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        scrollWheelZoom: false, // avoid hijacking page scroll — toggle on focus
      });
      containerRef.current.addEventListener("wheel", () => {
        if (!map.scrollWheelZoom.enabled()) map.scrollWheelZoom.enable();
      }, { once: true, passive: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      const pin = L.divIcon({
        className: "hiex-map-pin",
        html:
          '<span style="display:block;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,var(--brand),var(--brand-2));box-shadow:0 3px 8px rgba(0,0,0,.35);border:2.5px solid #fff"><span style="position:absolute;inset:6px;border-radius:50%;background:#fff"></span></span>',
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });

      const hasPin = typeof lat === "number" && typeof lng === "number";
      if (hasPin) {
        markerRef.current = L.marker([lat as number, lng as number], { icon: pin, draggable: true }).addTo(map);
        map.setView([lat as number, lng as number], 15);
        markerRef.current.on("dragend", () => {
          const p = markerRef.current?.getLatLng();
          if (p) onChangeRef.current(p.lat, p.lng);
        });
      }

      map.on("click", (e: LeafletNS.LeafletMouseEvent) => {
        onChangeRef.current(e.latlng.lat, e.latlng.lng);
        if (!markerRef.current) {
          markerRef.current = L.marker(e.latlng, { icon: pin, draggable: true }).addTo(map);
          markerRef.current.on("dragend", () => {
            const p = markerRef.current?.getLatLng();
            if (p) onChangeRef.current(p.lat, p.lng);
          });
        } else {
          markerRef.current.setLatLng(e.latlng);
        }
      });

      mapRef.current = map;
      setReady(true);
      // fix intrinsic size after layout settles
      setTimeout(() => map.invalidateSize(), 60);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  /* keep marker in sync when lat/lng change from outside (geolocate/clear) */
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !ready) return;
    const hasPin = typeof lat === "number" && typeof lng === "number";
    if (hasPin) {
      const pin = L.divIcon({
        className: "hiex-map-pin",
        html:
          '<span style="display:block;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,var(--brand),var(--brand-2));box-shadow:0 3px 8px rgba(0,0,0,.35);border:2.5px solid #fff"><span style="position:absolute;inset:6px;border-radius:50%;background:#fff"></span></span>',
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });
      if (!markerRef.current) {
        markerRef.current = L.marker([lat as number, lng as number], { icon: pin, draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const p = markerRef.current?.getLatLng();
          if (p) onChangeRef.current(p.lat, p.lng);
        });
      } else {
        markerRef.current.setLatLng([lat as number, lng as number]);
      }
    } else if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  }, [lat, lng, ready]);

  const detect = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onChangeRef.current(latitude, longitude);
        const map = mapRef.current;
        if (map) map.setView([latitude, longitude], 15);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const hasPin = typeof lat === "number" && typeof lng === "number";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-brand" />
          {m.pickHint}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={detect}
            disabled={locating}
            className="h-8 gap-1.5 rounded-lg px-3 text-[11px] font-bold"
          >
            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
            {m.detect}
          </Button>
          {hasPin ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(null, null)}
              className="h-8 gap-1.5 rounded-lg px-3 text-[11px] font-bold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {m.clear}
            </Button>
          ) : null}
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative z-0 h-72 w-full overflow-hidden rounded-2xl border border-border bg-muted sm:h-80"
        dir="ltr"
        aria-label={m.embedTitle}
      />
      {!ready ? (
        <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-border bg-muted sm:h-80">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      ) : null}

      <p className="text-[11px] font-bold tabular-nums text-muted-foreground" dir="ltr">
        {hasPin ? `${lat!.toFixed(5)}, ${lng!.toFixed(5)}` : lang === "ar" ? "لم يُحدد موقع بعد" : "Aucune position définie"}
      </p>
    </div>
  );
}

