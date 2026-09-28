"use client";

import React, { useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { useCampInfo } from "@/components/shared/camp-info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, Send, MapPin, Facebook, Instagram, MessageCircle } from "lucide-react";

export default function ContactPage() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const camp = useCampInfo();
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const waNumber = camp.whatsapp || "213550000000";
  const email = camp.email || "contact@happyinside-experience.dz";
  const facebook = camp.facebook || "https://facebook.com/happyinside.experience";
  const instagram = camp.instagram || "https://instagram.com/happyinside.experience";
  const intlPhone = waNumber.startsWith("213") ? `+${waNumber}` : `+213${waNumber.replace(/^0/, "")}`;
  const telNumber = waNumber.startsWith("213") ? `0${waNumber.slice(3)}` : waNumber;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: t.common.success, description: t.contact.success });
        setForm({ name: "", phone: "", email: "", subject: "", message: "" });
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[70vh] py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="section-line mx-auto text-3xl font-black sm:text-4xl">{t.contact.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t.contact.subtitle}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Info side */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="card-glow border-0 p-0">
              <CardContent className="space-y-4 p-6">
                <h2 className="text-base font-black">{t.contact.infoTitle}</h2>
                <a
                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent(t.whatsapp.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl bg-[#25D366]/10 p-3.5 transition-transform hover:scale-[1.02]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-md">
                    <svg viewBox="0 0 32 32" className="h-6 w-6 fill-white">
                      <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.594 4.466 1.72 6.412L3.2 28.8l6.556-1.686a12.75 12.75 0 0 0 6.246 1.62h.006c7.058 0 12.798-5.74 12.798-12.8 0-3.42-1.332-6.636-3.752-9.054a12.72 12.72 0 0 0-9.05-3.68zm5.838 18.42c-.32-.16-1.892-.934-2.186-1.04-.292-.108-.506-.16-.72.16-.212.32-.826 1.04-1.012 1.254-.186.212-.372.24-.692.08-.32-.16-1.352-.498-2.574-1.588-.952-.848-1.594-1.896-1.782-2.216-.186-.32-.02-.494.14-.652.144-.144.32-.374.48-.56.16-.186.212-.32.32-.532.106-.214.054-.4-.028-.56-.08-.16-.72-1.734-.986-2.374-.26-.624-.524-.54-.72-.548l-.614-.012c-.212 0-.56.08-.852.4-.292.32-1.118 1.092-1.118 2.664s1.144 3.09 1.304 3.306c.16.212 2.252 3.44 5.456 4.824.762.33 1.358.526 1.822.674.766.244 1.462.21 2.012.128.614-.092 1.892-.774 2.158-1.52.266-.748.266-1.388.186-1.522-.08-.134-.292-.214-.612-.374z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-black">{t.contact.whatsapp}</p>
                    <p className="text-xs text-muted-foreground">{t.contact.whatsappDesc}</p>
                  </div>
                </a>
                <a
                  href={`tel:${telNumber}`}
                  className="flex items-center gap-3 rounded-2xl bg-muted/70 p-3.5 transition-transform hover:scale-[1.02] hover:bg-muted"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white shadow-md">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black">{t.contact.phoneContact}</p>
                    <p className="text-xs font-semibold text-brand underline-offset-2 hover:underline" dir="ltr">{intlPhone}</p>
                  </div>
                </a>
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-3 rounded-2xl bg-muted/70 p-3.5 transition-transform hover:scale-[1.02] hover:bg-muted"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-2 text-white shadow-md">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black">Email</p>
                    <p className="truncate text-xs font-semibold text-brand-2 underline-offset-2 hover:underline" dir="ltr">{email}</p>
                  </div>
                </a>
                <div className="flex items-center gap-3 rounded-2xl bg-muted/70 p-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-3 text-white shadow-md">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black">{t.hero.location}</p>
                    <p className="text-xs text-muted-foreground">{lang === "ar" ? "زموري، بومرداس — الجزائر" : "Zemmouri, Boumerdès — Algérie"}</p>
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="mb-2.5 text-xs font-black uppercase text-muted-foreground">{t.contact.followUs}</p>
                  <div className="flex gap-2">
                    <a
                      href={facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1877F2] text-white shadow transition-transform hover:scale-110"
                    >
                      <Facebook className="h-4.5 w-4.5" />
                    </a>
                    <a
                      href={instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow transition-transform hover:scale-110"
                      style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
                    >
                      <Instagram className="h-4.5 w-4.5" />
                    </a>
                    <a
                      href={`https://wa.me/${waNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="WhatsApp"
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366] text-white shadow transition-transform hover:scale-110"
                    >
                      <MessageCircle className="h-4.5 w-4.5" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form side */}
          <Card className="card-glow border-0 p-0 lg:col-span-3">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t.contact.name} *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.common.phone} *</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      dir="ltr"
                      inputMode="tel"
                      className="h-11 text-start"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t.contact.email}</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      dir="ltr"
                      className="h-11 text-start"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.contact.subject} *</Label>
                    <Input
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="h-11"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.contact.message} *</Label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl font-extrabold shadow-lg shadow-brand/25 sm:w-auto sm:px-10"
                >
                  {loading ? t.common.sending : t.contact.send}
                  <Send className="h-4 w-4 rtl:-scale-x-100" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
