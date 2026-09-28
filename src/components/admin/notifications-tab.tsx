"use client";

import React, { useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BellRing, Send, Loader2 } from "lucide-react";

export default function NotificationsTab() {
  const { t } = useLang();
  const { toast } = useToast();
  const [form, setForm] = useState({ titleAr: "", titleFr: "", bodyAr: "", bodyFr: "", link: "" });
  const [push, setPush] = useState(true);
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, push }),
      });
      if (res.ok) {
        toast({ title: t.admin.notifications.sent });
        setForm({ titleAr: "", titleFr: "", bodyAr: "", bodyFr: "", link: "" });
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="card-glow border-0 p-0">
      <CardContent className="p-6">
        <h2 className="mb-1.5 flex items-center gap-2 text-base font-black">
          <BellRing className="h-5 w-5 text-brand-2" />
          {t.admin.notifications.title}
        </h2>
        <p className="mb-5 text-xs text-muted-foreground">{t.push.hint}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t.admin.notifications.titleAr}</Label>
            <Input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label>{t.admin.notifications.titleFr}</Label>
            <Input value={form.titleFr} onChange={(e) => setForm({ ...form, titleFr: e.target.value })} className="h-10" dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label>{t.admin.notifications.bodyAr}</Label>
            <Textarea value={form.bodyAr} onChange={(e) => setForm({ ...form, bodyAr: e.target.value })} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.admin.notifications.bodyFr}</Label>
            <Textarea value={form.bodyFr} onChange={(e) => setForm({ ...form, bodyFr: e.target.value })} rows={3} dir="ltr" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t.admin.notifications.link}</Label>
            <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="h-10" dir="ltr" placeholder="/announcements" />
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-bold text-brand-2">
          <Switch checked={push} onCheckedChange={setPush} />
          🚀 {t.admin.notifications.push}
        </label>

        <Button
          onClick={send}
          disabled={sending || !form.titleAr || !form.titleFr || !form.bodyAr || !form.bodyFr}
          className="mt-5 h-12 w-full rounded-xl font-extrabold shadow-lg shadow-brand-2/25 sm:w-auto sm:px-10"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />}
          {sending ? t.common.sending : t.admin.notifications.sendTo} — {t.admin.notifications.everyone}
        </Button>
      </CardContent>
    </Card>
  );
}
