"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/session-context";
import { LogoSkeleton } from "@/components/shared/logo";
import OverviewTab from "@/components/admin/overview-tab";
import UsersTab from "@/components/admin/users-tab";
import RegistrationsTab from "@/components/admin/registrations-tab";
import SettingsTab from "@/components/admin/settings-tab";
import AnnouncementsTab from "@/components/admin/announcements-tab";
import SpeakersTab from "@/components/admin/speakers-tab";
import MediaTab from "@/components/admin/media-tab";
import NotificationsTab from "@/components/admin/notifications-tab";
import MessagesTab from "@/components/admin/messages-tab";
import SuggestionsTab from "@/components/admin/suggestions-tab";
import FaqTab from "@/components/admin/faq-tab";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Settings2,
  Megaphone,
  Users2,
  Image as ImageIcon,
  BellRing,
  MessagesSquare,
  Lightbulb,
  HelpCircle,
  Shield,
} from "lucide-react";

const TABS = [
  { key: "overview", icon: LayoutDashboard, badge: false },
  { key: "registrations", icon: CalendarCheck, badge: false },
  { key: "users", icon: Users, badge: false },
  { key: "announcements", icon: Megaphone, badge: false },
  { key: "notifications", icon: BellRing, badge: false },
  { key: "settings", icon: Settings2, badge: false },
  { key: "speakers", icon: Users2, badge: false },
  { key: "media", icon: ImageIcon, badge: false },
  { key: "messages", icon: MessagesSquare, badge: false },
  { key: "suggestions", icon: Lightbulb, badge: false },
  { key: "faq", icon: HelpCircle, badge: false },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminPage() {
  const { t, lang } = useLang();
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>(() => {
    const q = searchParams?.get("tab") as TabKey | null;
    return q && TABS.some((x) => x.key === q) ? q : "overview";
  });
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!sessionLoading && (!user || user.role !== "admin")) {
      router.push("/login");
    }
  }, [user, sessionLoading, router]);

  useEffect(() => {
    const qtab = searchParams?.get("tab") as TabKey | null;
    if (qtab && TABS.some((x) => x.key === qtab)) {
      const id = requestAnimationFrame(() => setTab(qtab));
      return () => cancelAnimationFrame(id);
    }
  }, [searchParams]);

  useEffect(() => {
    const load = () =>
      fetch("/api/admin/stats", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!d.error) setUnread(d.unreadMessages || 0);
        })
        .catch(() => {});
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, []);

  if (sessionLoading || !user || user.role !== "admin") {
    return <LogoSkeleton label={t.common.loading} />;
  }

  const tabLabel = (key: TabKey): string =>
    (t.admin.tabs as Record<string, string>)[key] || key;

  return (
    <div className="relative min-h-[80vh] py-8">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-35" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-3 rounded-[2rem] border border-brand-3/30 bg-gradient-to-r from-brand-3/15 via-brand/10 to-brand-2/15 p-6 text-center shadow-lg sm:flex-row sm:text-start">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-3 to-brand text-white shadow-xl">
            <Shield className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black sm:text-2xl">{t.admin.title}</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">{t.admin.subtitle}</p>
          </div>
          <Link href="/dashboard" className="text-xs font-bold text-brand hover:underline">
            {t.nav.dashboard} →
          </Link>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Vertical tab sidebar */}
          <aside className="lg:w-60 lg:shrink-0">
            <nav
              className="scroll-area flex gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-sm lg:sticky lg:top-20 lg:flex-col lg:overflow-visible"
              aria-label={t.admin.title}
            >
              {TABS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all",
                    tab === item.key
                      ? "bg-gradient-to-r from-brand to-brand-3 text-white shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="whitespace-nowrap">{tabLabel(item.key)}</span>
                  {item.key === "messages" && unread > 0 ? (
                    <span className="ms-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-black text-white">
                      {unread}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {tab === "overview" ? <OverviewTab /> : null}
            {tab === "registrations" ? <RegistrationsTab /> : null}
            {tab === "users" ? <UsersTab /> : null}
            {tab === "announcements" ? <AnnouncementsTab /> : null}
            {tab === "notifications" ? <NotificationsTab /> : null}
            {tab === "settings" ? <SettingsTab /> : null}
            {tab === "speakers" ? <SpeakersTab /> : null}
            {tab === "media" ? <MediaTab /> : null}
            {tab === "messages" ? <MessagesTab /> : null}
            {tab === "suggestions" ? <SuggestionsTab /> : null}
            {tab === "faq" ? <FaqTab /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
