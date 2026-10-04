"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

/* CampInfo: live camp identity from the settings (logo, slogan, contacts,
   fee). Loaded once per session and re-fetched when the admin saves the
   camp settings (custom event "camp-settings-updated"). */

interface CampInfo {
  logo: string | null; // base64 data URL or null (default logo)
  sloganAr: string;
  sloganFr: string;
  whatsapp: string;
  email: string;
  facebook: string;
  instagram: string;
  fee: number; // specialist price (legacy field, kept for compatibility)
  studentFee: number; // student price
  specialistFee: number; // specialist price (alias of fee)
  mapLat: number | null; // Task 21 — exact camp pin (null = not set)
  mapLng: number | null; // Task 21 — exact camp pin
  loaded: boolean;
}

const EMPTY: CampInfo = {
  logo: null,
  sloganAr: "",
  sloganFr: "",
  whatsapp: "",
  email: "",
  facebook: "",
  instagram: "",
  fee: 0,
  studentFee: 0,
  specialistFee: 0,
  mapLat: null,
  mapLng: null,
  loaded: false,
};

const CampInfoContext = createContext<CampInfo>(EMPTY);

export function CampInfoProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<CampInfo>(EMPTY);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/camp", { cache: "no-store" });
      const data = await res.json();
      const s = data?.settings;
      if (!s) return;
      const fee = typeof s.fee === "number" ? s.fee : 0;
      setInfo({
        logo: typeof s.logo === "string" && s.logo ? s.logo : null,
        sloganAr: s.sloganAr || "",
        sloganFr: s.sloganFr || "",
        whatsapp: String(s.whatsappNumber || ""),
        email: String(s.email || ""),
        facebook: String(s.facebookUrl || ""),
        instagram: String(s.instagramUrl || ""),
        fee,
        studentFee:
          typeof s.studentFee === "number"
            ? s.studentFee
            : fee, // legacy DBs without studentFee → same as the main fee
        specialistFee: fee,
        mapLat: typeof s.mapLat === "number" ? s.mapLat : null,
        mapLng: typeof s.mapLng === "number" ? s.mapLng : null,
        loaded: true,
      });
    } catch {}
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(load);
    const handler = () => setTimeout(load, 50);
    window.addEventListener("camp-settings-updated", handler);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("camp-settings-updated", handler);
    };
  }, [load]);

  return <CampInfoContext.Provider value={info}>{children}</CampInfoContext.Provider>;
}

/** Safe hook: returns EMPTY when used outside the provider. */
export function useCampInfo(): CampInfo {
  return useContext(CampInfoContext);
}
