"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { LogoMark } from "@/components/shared/logo";
import { AlgeriaFlag } from "@/components/shared/flags";
import { showBubble } from "@/components/layout/floating-bubble";
import { useCampInfo } from "@/components/shared/camp-info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Home,
  CalendarHeart,
  Users,
  Megaphone,
  MessageCircleQuestion,
  Mail,
  Lightbulb,
  Shield,
  ScrollText,
  Image as ImageIcon,
  Facebook,
  Instagram,
  Mail as MailIcon,
  Phone,
  Heart,
  MessageCircle,
} from "lucide-react";
import PushOptIn, { InstallPWAButton } from "@/components/layout/push-opt-in";

export default function Footer() {
  const { t, lang } = useLang();
  const camp = useCampInfo();
  const slogan = (lang === "ar" ? camp.sloganAr : camp.sloganFr) || t.slogan;
  const waNumber = camp.whatsapp || "213550000000";
  const email = camp.email || "contact@happyinside-experience.dz";
  const facebook = camp.facebook || "https://facebook.com/happyinside.experience";
  const instagram = camp.instagram || "https://instagram.com/happyinside.experience";
  // tel: link needs the local format; WhatsApp uses the international one
  const telNumber = waNumber.startsWith("213") ? `0${waNumber.slice(3)}` : waNumber;
  const [hiddenBubbles, setHiddenBubbles] = useState<{ chat: boolean; wa: boolean }>({
    chat: false,
    wa: false,
  });

  useEffect(() => {
    const read = () => {
      try {
        setHiddenBubbles({
          chat: window.localStorage.getItem("hiex_chat_hidden") === "1",
          wa: window.localStorage.getItem("hiex_wa_hidden") === "1",
        });
      } catch {}
    };
    read();
    const handler = () => setTimeout(read, 30);
    window.addEventListener("hiex-bubble-state", handler);
    window.addEventListener("hiex-show-bubble", handler);
    return () => {
      window.removeEventListener("hiex-bubble-state", handler);
      window.removeEventListener("hiex-show-bubble", handler);
    };
  }, []);

  const quickLinks = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/about", label: t.nav.about, icon: CalendarHeart },
    { href: "/speakers", label: t.nav.speakers, icon: Users },
    { href: "/participants", label: t.nav.participants, icon: Users },
    { href: "/announcements", label: t.nav.announcements, icon: Megaphone },
    { href: "/gallery", label: t.nav.gallery, icon: ImageIcon },
  ];

  const helpLinks = [
    { href: "/faq", label: t.nav.faq, icon: MessageCircleQuestion },
    { href: "/contact", label: t.nav.contact, icon: Mail },
    { href: "/suggestions", label: t.nav.suggestions, icon: Lightbulb },
  ];

  const legalLinks = [
    { href: "/privacy", label: t.nav.privacy, icon: Shield },
    { href: "/terms", label: t.nav.terms, icon: ScrollText },
  ];

  return (
    <footer className="mt-auto w-full">
      {/* Interactive accent bar */}
      <div className="relative h-1.5 w-full overflow-hidden bg-gradient-to-r from-brand via-brand-3 to-brand-2">
        <div className="absolute inset-0 animate-pulse bg-white/10" />
      </div>

      <div className="bg-gradient-to-b from-card to-muted/60 dark:from-card dark:to-background">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3">
                <LogoMark size={52} />
                <div>
                  <p className="text-lg font-extrabold">
                    Happy <span className="text-gradient">inside</span> <span className="italic">expérience</span>
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground">{t.footer.edition}</p>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {t.footer.about}
              </p>
              <div className="mt-5">
                <p className="text-sm font-bold">{t.footer.newsletter}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.footer.newsletterDesc}</p>
                <div className="mt-3 max-w-xs space-y-2">
                  <PushOptIn compact />
                  <InstallPWAButton compact />
                </div>
              </div>
            </div>

            {/* Quick links */}
            <nav aria-label={t.footer.quickLinks}>
              <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wide">{t.footer.quickLinks}</h3>
              <ul className="space-y-2.5">
                {quickLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-brand"
                    >
                      <l.icon className="h-3.5 w-3.5 text-brand/70 transition-transform group-hover:scale-110" />
                      <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-x-0.5">
                        {l.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Help links */}
            <nav aria-label={t.footer.help}>
              <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wide">{t.footer.help}</h3>
              <ul className="space-y-2.5">
                {helpLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-brand-2"
                    >
                      <l.icon className="h-3.5 w-3.5 text-brand-2/70 transition-transform group-hover:scale-110" />
                      <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-x-0.5">
                        {l.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <h3 className="mb-4 mt-6 text-sm font-extrabold uppercase tracking-wide">{t.footer.legal}</h3>
              <ul className="space-y-2.5">
                {legalLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <l.icon className="h-3.5 w-3.5 opacity-70" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Follow */}
            <div>
              <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wide">{t.footer.follow}</h3>
              <div className="flex flex-wrap gap-2.5">
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1877F2] text-white shadow-md transition-transform hover:scale-110 hover:shadow-lg"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md transition-transform hover:scale-110 hover:shadow-lg"
                  style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-md transition-transform hover:scale-110 hover:shadow-lg"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
                <a
                  href={`mailto:${email}`}
                  aria-label="Email"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white shadow-md transition-transform hover:scale-110 hover:shadow-lg"
                >
                  <MailIcon className="h-5 w-5" />
                </a>
              </div>

              {/* Clickable contact info (tel: / mailto: / wa.me) */}
              <div className="mt-4 space-y-2">
                <a
                  href={`tel:${telNumber}`}
                  className="flex items-center gap-2.5 rounded-xl bg-muted/70 p-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span dir="ltr" className="text-xs">+{waNumber.startsWith("213") ? waNumber : `213${waNumber.replace(/^0/, "")}`}</span>
                </a>
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2.5 rounded-xl bg-muted/70 p-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-2 text-white">
                    <MailIcon className="h-4 w-4" />
                  </span>
                  <span dir="ltr" className="truncate text-xs">{email}</span>
                </a>
              </div>
              <div className="mt-6 rounded-2xl border border-brand-2/30 bg-brand-2/5 p-4">
                <p className="text-sm font-bold text-brand-2">{slogan}</p>
              </div>
              {(hiddenBubbles.chat || hiddenBubbles.wa) && (
                <div className="mt-4 space-y-2">
                  {hiddenBubbles.chat && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 rounded-xl"
                      onClick={() => showBubble("hiex_chat_hidden")}
                    >
                      <MessageCircle className="h-4 w-4 text-brand" />
                      {t.bubble.showChat}
                    </Button>
                  )}
                  {hiddenBubbles.wa && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 rounded-xl"
                      onClick={() => showBubble("hiex_wa_hidden")}
                    >
                      <svg viewBox="0 0 32 32" className="h-4 w-4 fill-[#25D366]" aria-hidden="true">
                        <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.594 4.466 1.72 6.412L3.2 28.8l6.556-1.686a12.75 12.75 0 0 0 6.246 1.62h.006c7.058 0 12.798-5.74 12.798-12.8 0-3.42-1.332-6.636-3.752-9.054a12.72 12.72 0 0 0-9.05-3.68zm0 23.396h-.004c-1.94 0-3.848-.522-5.512-1.508l-.396-.234-4.1 1.054 1.096-4.0-.258-.41a10.63 10.63 0 0 1-1.63-5.66c0-5.868 4.776-10.64 10.65-10.64 2.844 0 5.516 1.108 7.526 3.12a10.58 10.58 0 0 1 3.116 7.528c-.002 5.868-4.78 10.75-10.488 10.75zm5.838-7.976c-.32-.16-1.892-.934-2.186-1.04-.292-.108-.506-.16-.72.16-.212.32-.826 1.04-1.012 1.254-.186.212-.372.24-.692.08-.32-.16-1.352-.498-2.574-1.588-.952-.848-1.594-1.896-1.782-2.216-.186-.32-.02-.494.14-.652.144-.144.32-.374.48-.56.16-.186.212-.32.32-.532.106-.214.054-.4-.028-.56-.08-.16-.72-1.734-.986-2.374-.26-.624-.524-.54-.72-.548l-.614-.012c-.212 0-.56.08-.852.4-.292.32-1.118 1.092-1.118 2.664s1.144 3.09 1.304 3.306c.16.212 2.252 3.44 5.456 4.824.762.33 1.358.526 1.822.674.766.244 1.462.21 2.012.128.614-.092 1.892-.774 2.158-1.52.266-.748.266-1.388.186-1.522-.08-.134-.292-.214-.612-.374z" />
                      </svg>
                      {t.bubble.showWhatsapp}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/70">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 pb-24 sm:flex-row sm:px-6 sm:pb-5">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Happy inside expérience — {t.footer.rights} · {t.edition}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {t.footer.madeWith}
              <Heart className="h-3.5 w-3.5 fill-brand text-brand" />
              <AlgeriaFlag className="h-3 w-4.5 rounded-sm" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
