"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useLang, useHydrated } from "@/lib/i18n/context";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import AnnouncementBar from "@/components/layout/announcement-bar";
import WhatsAppButton from "@/components/layout/whatsapp-button";
import Chatbot from "@/components/layout/chatbot";
import ActivityFeed from "@/components/layout/activity-feed";
import { PushFloatingPrompt } from "@/components/layout/push-opt-in";
import { LogoSkeleton } from "@/components/shared/logo";
import { CampInfoProvider } from "@/components/shared/camp-info";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const { t } = useLang();
  const hydrated = useHydrated();
  const pathname = usePathname();

  if (!hydrated) {
    return <LogoSkeleton />;
  }

  return (
    <CampInfoProvider>
      <div className="flex min-h-screen flex-col">
        <AnnouncementBar />
        <Header />
        <main key={pathname} className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
        <Chatbot />
        <ActivityFeed />
        <PushFloatingPrompt />
      </div>
    </CampInfoProvider>
  );
}
