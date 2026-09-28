"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Bell, BellRing, X, Smartphone, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export async function enablePushNotifications(): Promise<"ok" | "unsupported" | "denied" | "error"> {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";
    const reg = await registerServiceWorker();
    if (!reg) return "error";
    await navigator.serviceWorker.ready;
    const res = await fetch("/api/push/subscribe");
    const { publicKey } = await res.json();
    if (!publicKey) return "error";
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existing.toJSON()),
      });
      return "ok";
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    return "ok";
  } catch {
    return "error";
  }
}

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/* ============================================================
   PWA install button (beforeinstallprompt)
   ============================================================ */
interface BipEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWAButton({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { t } = useLang();
  const [deferred, setDeferred] = useState<BipEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => {
    try {
      return window.matchMedia("(display-mode: standalone)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BipEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-3 py-2 text-xs font-bold text-brand",
          className
        )}
      >
        <MonitorSmartphone className="h-4 w-4" />
        {t.push.installed}
      </div>
    );
  }

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } catch {}
    setDeferred(null);
  };

  if (!deferred) {
    // No install prompt available (already installed / unsupported / iOS) — show manual hint
    return (
      <p className={cn("flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground", className)}>
        <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.push.howInstall}
      </p>
    );
  }

  return compact ? (
    <Button
      onClick={install}
      size="sm"
      variant="outline"
      className={cn("w-full gap-2 rounded-xl font-bold", className)}
    >
      <Smartphone className="h-4 w-4 text-brand" />
      {t.push.install}
    </Button>
  ) : (
    <Button
      onClick={install}
      size="sm"
      variant="outline"
      className={cn("gap-2 rounded-full", className)}
    >
      <Smartphone className="h-4 w-4 text-brand" />
      {t.push.install}
    </Button>
  );
}

/* ============================================================
   Opt-in widgets
   ============================================================ */
export default function PushOptIn({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { t } = useLang();
  const [status, setStatus] = useState<"idle" | "enabled" | "loading" | "denied">(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") return "enabled";
      if (Notification.permission === "denied") return "denied";
    }
    return "idle";
  });

  const enable = useCallback(async () => {
    setStatus("loading");
    const r = await enablePushNotifications();
    setStatus(r === "ok" ? "enabled" : r === "denied" ? "denied" : "idle");
  }, []);

  if (status === "enabled") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-brand-2/40 bg-brand-2/10 px-3 py-2 text-xs font-bold text-brand-2",
          className
        )}
      >
        <BellRing className="h-4 w-4" />
        {t.push.enabled}
      </div>
    );
  }

  if (compact) {
    return (
      <Button
        onClick={enable}
        disabled={status === "loading" || status === "denied"}
        size="sm"
        className={cn("w-full gap-2 rounded-xl bg-brand-2 hover:bg-brand-2/90", className)}
      >
        <Bell className="h-4 w-4" />
        {status === "loading" ? t.common.loading : status === "denied" ? t.push.unsupported : t.push.enable}
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button
        onClick={enable}
        disabled={status === "loading"}
        size="sm"
        variant="outline"
        className="gap-2 rounded-full"
      >
        <Bell className="h-4 w-4 text-brand-2" />
        {status === "loading" ? t.common.loading : status === "denied" ? t.push.unsupported : t.push.enable}
      </Button>
      <p className="hidden text-xs text-muted-foreground sm:block">{t.push.hint}</p>
    </div>
  );
}

/* Floating prompt: appears once, contains an EXPLICIT "enable notifications"
   button (تفعيل الإشعارات) plus a later/dismiss button. */
export function PushFloatingPrompt() {
  const { t } = useLang();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const decide = () => {
      const dismissed = window.localStorage.getItem("hiex_push_dismissed");
      const enabled = window.localStorage.getItem("hiex_push_enabled");
      if (!dismissed && !enabled && "Notification" in window && Notification.permission === "default") {
        timer = setTimeout(() => setShow(true), 9000);
      }
    };
    decide();
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    window.localStorage.setItem("hiex_push_dismissed", "1");
  };

  const enable = async () => {
    const r = await enablePushNotifications();
    if (r === "ok") window.localStorage.setItem("hiex_push_enabled", "1");
    dismiss();
  };

  if (!show) return null;

  return (
    /* Positioned ABOVE the floating announcement card (bottom-20 ≈ 80px +
       ~90px card height) so the two never overlap and both stay clickable */
    <div className="fixed bottom-[14rem] end-4 z-[66] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-brand/30 bg-card/95 p-4 shadow-2xl backdrop-blur-md sm:w-80">
      <button
        type="button"
        onClick={dismiss}
        aria-label={t.common.close}
        className="absolute end-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="pulse-ring relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-2/15">
          <Bell className="h-5 w-5 text-brand-2" />
        </div>
        <div className="flex-1 pe-6">
          <p className="text-sm font-extrabold">{t.push.enable}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t.push.hint}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-full bg-brand-2 px-4 font-extrabold hover:bg-brand-2/90"
              onClick={enable}
            >
              <BellRing className="h-4 w-4" />
              {t.push.enable}
            </Button>
            <Button size="sm" variant="ghost" className="h-9 rounded-full px-4" onClick={dismiss}>
              {t.push.later}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
