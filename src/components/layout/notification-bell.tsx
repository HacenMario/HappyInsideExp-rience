"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PushOptIn from "@/components/layout/push-opt-in";
import { Bell, Check, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotifItem {
  id: string;
  titleAr: string;
  titleFr: string;
  bodyAr: string;
  bodyFr: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { lang, t } = useLang();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        const data = await res.json();
        if (alive) setItems(data.notifications || []);
      } catch {}
    };
    load();
    const iv = setInterval(load, 60000); // Task 19: gentler poll
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const unread = items.filter((i) => !i.read).length;

  const markAll = async () => {
    await fetch("/api/notifications", { method: "PUT" });
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  const markOne = async (id: string) => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-full" aria-label={t.nav.notifications}>
          <Bell className="h-4.5 w-4.5 text-brand-2" />
          {unread > 0 ? (
            <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-extrabold text-white shadow-md">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        {/* Enable-notifications button inside the notifications window */}
        <div className="border-b border-border px-4 py-2.5">
          <PushOptIn compact />
        </div>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-extrabold">{t.dash.myNotifications}</p>
          {unread > 0 ? (
            <button
              onClick={markAll}
              className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              <Check className="h-3.5 w-3.5" />
              {t.dash.markAllRead}
            </button>
          ) : null}
        </div>
        <div className="scroll-area max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <BellOff className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{t.dash.noNotifications}</p>
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "border-b border-border/60 px-4 py-3 transition-colors last:border-0 hover:bg-muted/60",
                  !n.read && "bg-brand/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm leading-snug", !n.read ? "font-bold" : "font-semibold")}>
                      {lang === "ar" ? n.titleAr : n.titleFr}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {lang === "ar" ? n.bodyAr : n.bodyFr}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground/70">
                        {new Date(n.createdAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {n.link ? (
                        <Link href={n.link} onClick={() => markOne(n.id)} className="text-[10px] font-bold text-brand hover:underline">
                          {t.common.readMore} →
                        </Link>
                      ) : null}
                      {!n.read ? (
                        <button onClick={() => markOne(n.id)} className="text-[10px] text-muted-foreground hover:underline">
                          {t.common.close}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {!n.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" /> : null}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
