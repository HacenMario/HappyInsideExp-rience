"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Pin, Trash2, Pencil, Loader2, BellRing } from "lucide-react";

interface Announcement {
  _id: string;
  titleAr: string;
  titleFr: string;
  bodyAr: string;
  bodyFr: string;
  pinned: boolean;
  active: boolean;
  createdAt: string;
}

const emptyForm = { titleAr: "", titleFr: "", bodyAr: "", bodyFr: "", pinned: false, active: true, notify: false };

export default function AnnouncementsTab() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [list, setList] = useState<Announcement[] | null>(null);
  const [form, setForm] = useState<typeof emptyForm & { _id?: string }>(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/announcements", { cache: "no-store" });
    const data = await res.json();
    if (!data.error) setList(data.announcements);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const { _id, notify, ...rest } = form;
      const res = await fetch("/api/admin/announcements", {
        method: _id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(_id ? { id: _id, ...rest } : { ...rest, notify }),
      });
      if (res.ok) {
        toast({ title: t.admin.annForm.created });
        setOpen(false);
        setForm(emptyForm);
        await load();
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const edit = (a: Announcement) => {
    setForm({ ...a, notify: false });
    setOpen(true);
  };

  const toggle = async (a: Announcement, key: "pinned" | "active") => {
    await fetch("/api/admin/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a._id, [key]: !a[key] }),
    });
    await load();
  };

  const del = async (id: string) => {
    if (!window.confirm(t.admin.users.confirmDelete)) return;
    const res = await fetch(`/api/admin/announcements?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: t.admin.annForm.deleted });
      await load();
    }
  };

  return (
    <div className="space-y-5">
      <Card className="card-glow border-0 p-0">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-black">
              <Megaphone className="h-5 w-5 text-brand" />
              {t.admin.tabs.announcements}
            </h2>
            <Button
              onClick={() => {
                setForm(emptyForm);
                setOpen(true);
              }}
              className="rounded-full font-bold shadow-md shadow-brand/25"
              size="sm"
            >
              <Plus className="h-4 w-4" /> {t.admin.annForm.new}
            </Button>
          </div>

          {list === null ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="shimmer h-16 rounded-xl" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.ann.empty}</p>
          ) : (
            <div className="scroll-area max-h-[55vh] space-y-3 overflow-y-auto pe-1">
              {list.map((a) => (
                <div
                  key={a._id}
                  className={
                    "rounded-2xl border p-4 transition-colors " +
                    (a.active ? "border-border bg-card" : "border-border bg-muted/50 opacity-60")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {a.pinned ? <Pin className="h-3.5 w-3.5 text-brand-3" /> : null}
                        <p className="text-sm font-extrabold">{a.titleAr}</p>
                      </div>
                      <p className="truncate text-xs text-muted-foreground" dir="ltr">{a.titleFr}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.bodyAr}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggle(a, "pinned")} title={t.admin.annForm.pinned}>
                        <Pin className={"h-4 w-4 " + (a.pinned ? "text-brand-3" : "text-muted-foreground")} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => edit(a)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del(a._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className={a.active ? "bg-brand-2/15 text-brand-2" : "bg-destructive/15 text-destructive"}>
                      {a.active ? t.common.active : t.common.inactive}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form dialog */}
      {open ? (
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-black">
              {form._id ? t.admin.annForm.edit : t.admin.annForm.new}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t.admin.annForm.titleAr}</Label>
                <Input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.annForm.titleFr}</Label>
                <Input value={form.titleFr} onChange={(e) => setForm({ ...form, titleFr: e.target.value })} className="h-10" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.annForm.bodyAr}</Label>
                <Textarea value={form.bodyAr} onChange={(e) => setForm({ ...form, bodyAr: e.target.value })} rows={4} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.annForm.bodyFr}</Label>
                <Textarea value={form.bodyFr} onChange={(e) => setForm({ ...form, bodyFr: e.target.value })} rows={4} dir="ltr" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                <Switch checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: v })} />
                {t.admin.annForm.pinned}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                {t.admin.annForm.active}
              </label>
              {!form._id ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-brand-2">
                  <Switch checked={form.notify} onCheckedChange={(v) => setForm({ ...form, notify: v })} />
                  <BellRing className="h-4 w-4" />
                  {t.admin.annForm.notify}
                </label>
              ) : null}
            </div>
            {!form._id && form.notify ? (
              <p className="mt-2 rounded-xl bg-brand-2/10 p-2.5 text-xs font-semibold text-brand-2">
                🚀 {t.admin.annForm.notifyHint}
              </p>
            ) : null}
            <div className="mt-5 flex gap-3">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-xl">
                {t.common.cancel}
              </Button>
              <Button onClick={save} disabled={saving} className="flex-[2] rounded-xl font-extrabold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t.common.save}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
