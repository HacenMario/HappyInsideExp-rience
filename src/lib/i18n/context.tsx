"use client";

import React, { createContext, useContext, useEffect, useCallback, useSyncExternalStore } from "react";
import { dictionary, type Lang, type Dict } from "./dictionary";

/* ---- External store for language (localStorage-backed) ---- */
const langListeners = new Set<() => void>();

function subscribeLang(cb: () => void) {
  langListeners.add(cb);
  return () => {
    langListeners.delete(cb);
  };
}

function getLangSnapshot(): Lang {
  try {
    const saved = window.localStorage.getItem("hiex_lang");
    return saved === "fr" ? "fr" : "ar";
  } catch {
    return "ar";
  }
}

function getLangServerSnapshot(): Lang {
  return "ar";
}

function emitLangChange() {
  langListeners.forEach((cb) => cb());
}

/* ---- Hydration detector (no setState needed) ---- */
const emptySubscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

interface LangContextValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: Dict;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribeLang, getLangSnapshot, getLangServerSnapshot);
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    }
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    try {
      window.localStorage.setItem("hiex_lang", l);
    } catch {}
    emitLangChange();
  }, []);

  const toggleLang = useCallback(() => {
    const current = getLangSnapshot();
    const next: Lang = current === "ar" ? "fr" : "ar";
    try {
      window.localStorage.setItem("hiex_lang", next);
    } catch {}
    emitLangChange();
  }, []);

  const t = dictionary[lang] as Dict;

  return (
    <LangContext.Provider value={{ lang, dir, t, setLang, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
