"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/session-context";
import { AlgeriaFlag, FranceFlag } from "@/components/shared/flags";
import { LogoMark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Moon,
  Sun,
  Globe,
  Menu,
  LogIn,
  LogOut,
  LayoutDashboard,
  Shield,
  UserRound,
  Sparkles,
  Megaphone,
  Users,
  MessageCircleQuestion,
  Mail,
  Lightbulb,
  Home,
  CalendarHeart,
  Image as ImageIcon,
  ScrollText,
  FileText,
  Bell,
  ChevronDown,
  X,
} from "lucide-react";
import NotificationBell from "@/components/layout/notification-bell";
import { useCampInfo } from "@/components/shared/camp-info";
import { cn } from "@/lib/utils";

export default function Header() {
  const { t, lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const { user, logout, loading } = useSession();
  const camp = useCampInfo();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const slogan = (lang === "ar" ? camp.sloganAr : camp.sloganFr) || t.slogan;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const mainLinks = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/about", label: t.nav.about, icon: CalendarHeart },
    { href: "/speakers", label: t.nav.speakers, icon: Users },
    { href: "/participants", label: t.nav.participants, icon: Users },
    { href: "/announcements", label: t.nav.announcements, icon: Megaphone },
    { href: "/gallery", label: t.nav.gallery, icon: ImageIcon },
  ];

  const secondaryLinks = [
    { href: "/faq", label: t.nav.faq, icon: MessageCircleQuestion },
    { href: "/contact", label: t.nav.contact, icon: Mail },
    { href: "/suggestions", label: t.nav.suggestions, icon: Lightbulb },
    { href: "/privacy", label: t.nav.privacy, icon: Shield },
    { href: "/terms", label: t.nav.terms, icon: ScrollText },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/70 bg-background shadow-[0_1px_3px_oklch(0_0_0/0.04)] transition-shadow duration-300",
        scrolled && "shadow-[0_4px_16px_-6px_oklch(0_0_0/0.12)]"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
        {/* Logo + brand */}
        <Link href="/" className="group flex min-w-0 items-center gap-2.5" aria-label={t.brand}>
          <div className="shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <LogoMark size={40} className="sm:hidden" />
            <LogoMark size={42} className="hidden sm:block" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[13px] font-extrabold tracking-tight sm:text-base">
              Happy <span className="text-gradient">inside</span> <span className="italic">expérience</span>
            </span>
            <span className="hidden truncate text-[10px] font-medium text-muted-foreground min-[420px]:block sm:text-[11px]">
              {slogan}
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="main">
          {mainLinks.slice(0, 4).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                isActive(l.href)
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/75 hover:bg-muted hover:text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full px-3 py-2 text-sm font-semibold text-foreground/75 transition-colors hover:bg-muted hover:text-foreground">
                {t.nav.more}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52">
              {mainLinks.slice(4).map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
                >
                  <l.icon className="h-4 w-4 text-brand" />
                  {l.label}
                </Link>
              ))}
              <div className="my-1 h-px bg-border" />
              {secondaryLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
                >
                  <l.icon className="h-4 w-4 text-brand-2" />
                  {l.label}
                </Link>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Theme toggle */}
          <Button
            variant="outline"
            size="icon"
            className="rounded-full px-0"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={t.common.theme}
          >
            <Sun className="hidden h-4.5 w-4.5 text-brand-3 dark:block" />
            <Moon className="h-4.5 w-4.5 dark:hidden" />
          </Button>

          {/* Language selector with flags + on/off switches */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 rounded-full px-2 sm:gap-1.5 sm:px-2.5" aria-label={t.common.language}>
                <Globe className="h-4 w-4 text-brand-2" />
                <span className="hidden text-xs font-bold min-[400px]:inline">{lang === "ar" ? "AR" : "FR"}</span>
                <ChevronDown className="hidden h-3 w-3 opacity-60 min-[400px]:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2">
              <p className="px-2 pb-1.5 text-xs font-bold text-muted-foreground">{t.common.language}</p>
              <div className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-muted">
                <div className="flex items-center gap-2.5">
                  <AlgeriaFlag className="h-5 w-8 rounded shadow-sm" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">العربية</span>
                    <span className="text-[10px] text-muted-foreground">Arabe / Arabic</span>
                  </div>
                </div>
                <Switch
                  checked={lang === "ar"}
                  onCheckedChange={(v) => v && setLang("ar")}
                  aria-label="Arabic"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-muted">
                <div className="flex items-center gap-2.5">
                  <FranceFlag className="h-5 w-8 rounded shadow-sm" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">Français</span>
                    <span className="text-[10px] text-muted-foreground">الفرنسية / French</span>
                  </div>
                </div>
                <Switch
                  checked={lang === "fr"}
                  onCheckedChange={(v) => v && setLang("fr")}
                  aria-label="Français"
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          {user ? <NotificationBell /> : null}

          {/* Auth */}
          {!loading && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-full px-2.5">
                  <UserRound className="h-4 w-4 text-brand" />
                  <span className="hidden max-w-24 truncate text-xs font-bold md:inline">
                    {user.fullName.split(" ")[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-2">
                <div className="border-b border-border px-3 pb-2 pt-1">
                  <p className="truncate text-sm font-bold">{user.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">{user.phone}</p>
                  {user.role === "admin" ? (
                    <Badge className="mt-1.5 bg-brand-3/20 text-brand-3 border border-brand-3/40 text-[10px]">
                      <Shield className="mr-1 h-3 w-3" /> ADMIN
                    </Badge>
                  ) : null}
                </div>
                <Link
                  href="/dashboard"
                  className="mt-1 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
                >
                  <LayoutDashboard className="h-4 w-4 text-brand-2" /> {t.nav.dashboard}
                </Link>
                {user.role === "admin" ? (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-muted"
                  >
                    <Shield className="h-4 w-4 text-brand-3" /> {t.nav.adminPanel}
                  </Link>
                ) : null}
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" /> {t.nav.logout}
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !loading ? (
            <Link href="/login" className="hidden sm:block">
              <Button size="sm" className="gap-1.5 rounded-full px-4 shadow-md shadow-brand/25">
                <LogIn className="h-4 w-4" />
                {t.nav.login}
              </Button>
            </Link>
          ) : null}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full xl:hidden" aria-label={t.nav.menu}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side={lang === "ar" ? "right" : "left"}
              className="w-80 overflow-y-auto p-0 [&>button]:hidden"
            >
              <SheetTitle className="border-b border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <LogoMark size={40} className="shrink-0" />
                    <div className="min-w-0">
                    <p className="truncate text-[13px] font-extrabold">Happy inside expérience</p>
                    <p className="truncate text-[10px] text-muted-foreground">{slogan}</p>
                  </div>
                  </div>
                  <SheetClose
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t.common.close}
                  >
                    <X className="h-4.5 w-4.5" />
                  </SheetClose>
                </div>
              </SheetTitle>
              <div className="flex flex-col p-3">
                <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase text-muted-foreground">{t.nav.menu}</p>
                {mainLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors",
                      isActive(l.href) ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <l.icon className="h-4.5 w-4.5 text-brand" />
                    {l.label}
                  </Link>
                ))}
                <p className="px-2 pb-1 pt-4 text-[11px] font-bold uppercase text-muted-foreground">
                  {t.footer.help}
                </p>
                {secondaryLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors hover:bg-muted"
                  >
                    <l.icon className="h-4.5 w-4.5 text-brand-2" />
                    {l.label}
                  </Link>
                ))}
                <div className="mt-4 border-t border-border pt-4">
                  {!loading && user ? (
                    <div className="flex flex-col gap-2">
                      <Link
                        href="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-muted"
                      >
                        <LayoutDashboard className="h-4.5 w-4.5 text-brand-2" /> {t.nav.dashboard}
                      </Link>
                      {user.role === "admin" ? (
                        <Link
                          href="/admin"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-muted"
                        >
                          <Shield className="h-4.5 w-4.5 text-brand-3" /> {t.nav.adminPanel}
                        </Link>
                      ) : null}
                      <Button
                        variant="destructive"
                        className="w-full rounded-xl"
                        onClick={logout}
                      >
                        <LogOut className="h-4 w-4" /> {t.nav.logout}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link href="/login" onClick={() => setMobileOpen(false)}>
                        <Button className="w-full rounded-xl gap-2">
                          <LogIn className="h-4 w-4" /> {t.nav.login}
                        </Button>
                      </Link>
                      <Link href="/register" onClick={() => setMobileOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl gap-2">
                          <Sparkles className="h-4 w-4" /> {t.auth.registerTitle}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Scroll progress-like accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-brand via-brand-3 to-brand-2 opacity-80" />
    </header>
  );
}
