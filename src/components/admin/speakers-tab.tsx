"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, Camera, Users2 } from "lucide-react";
import { fileToDataUrl } from "@/lib/image-client";

interface Speaker {
  _id: string;
  name: string;
  nameAr: string;
  titleAr: string;
  titleFr: string;
  bioAr: string;
  bioFr: string;
  activityAr: string;
  activityFr: string;
  photo: string | null;
  order: number;
  active: boolean;
}

const emptyForm = {
  name: "",
  nameAr: "",
  titleAr: "",
  titleFr: "",
  bioAr: "",
  bioFr: "",
  activityAr: "",
  activityFr: "",
  photo: null as string | null,
  order: 99,
  active: true,
};

export default function SpeakersTab() {
  const { t } = useLang();
  const { toast } = useToast();
  const [list, setList] = useState<Speaker[] | null>(null);
  const [form, setForm] = useState<typeof emptyForm & { _id?: string }>(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/speakers", { cache: "no-store" });
    const data = await res.json();
    if (!data.error) setList(data.speakers);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const { _id, ...rest } = form;
      const res = await fetch("/api/admin/speakers", {
        method: _id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(_id ? { id: _id, ...rest } : rest),
      });
      if (res.ok) {
        toast({ title: t.admin.speakersForm.saved });
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

  const del = async (id: string) => {
    if (!window.confirm(t.admin.users.confirmDelete)) return;
    const res = await fetch(`/api/admin/speakers?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
      toast({ title: t.common.success });
    }
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    // Compressed in-browser — photos stay sharp but tiny on any host
    const dataUrl = await fileToDataUrl(file, { maxDim: 800, quality: 0.85, maxBytes: 600 * 1024 });
    setForm((f) => ({ ...f, photo: dataUrl }));
  };

  return (
    <div className="space-y-5">
      <Card className="card-glow border-0 p-0">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-black">
              <Users2 className="h-5 w-5 text-brand" />
              {t.admin.tabs.speakers}
            </h2>
            <Button
              size="sm"
              className="rounded-full font-bold shadow-md shadow-brand/25"
              onClick={() => {
                setForm(emptyForm);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> {t.admin.speakersForm.new}
            </Button>
          </div>

          {list === null ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="shimmer h-40 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <div key={s._id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    {s.photo ? (
                      <Image src={s.photo} alt={s.name} width={64} height={64} className="h-14 w-14 rounded-full border-2 border-brand-3/50 object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 text-xl font-black text-brand">
                        {s.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.nameAr}</p>
                    </div>
                  </div>
                  <p className="mt-2.5 line-clamp-2 rounded-xl bg-muted/60 p-2.5 text-xs">{s.activityAr}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Switch checked={s.active} onCheckedChange={async (v) => {
                      await fetch("/api/admin/speakers", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: s._id, active: v }),
                      });
                      await load();
                    }} />
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setForm({ ...s });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del(s._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {open ? (
        <Card className="card-glow border-0 p-0">
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-black">{form._id ? t.admin.speakersForm.edit : t.admin.speakersForm.new}</h3>

            {/* Photo */}
            <div className="mb-5 flex items-center gap-4">
              {form.photo ? (
                <Image src={form.photo} alt="photo" width={80} height={80} className="h-20 w-20 rounded-2xl border-2 border-brand/40 object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                  <Camera className="h-7 w-7 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-extrabold text-white">
                    <Camera className="h-3.5 w-3.5" /> {t.dash.uploadPhoto}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
                </label>
                {form.photo ? (
                  <button onClick={() => setForm({ ...form, photo: null })} className="text-xs font-bold text-destructive hover:underline">
                    {t.dash.removePhoto}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t.admin.speakersForm.name}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.speakersForm.nameAr}</Label>
                <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.speakersForm.titleAr}</Label>
                <Input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.speakersForm.titleFr}</Label>
                <Input value={form.titleFr} onChange={(e) => setForm({ ...form, titleFr: e.target.value })} className="h-10" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.speakersForm.activityAr}</Label>
                <Textarea value={form.activityAr} onChange={(e) => setForm({ ...form, activityAr: e.target.value })} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.speakersForm.activityFr}</Label>
                <Textarea value={form.activityFr} onChange={(e) => setForm({ ...form, activityFr: e.target.value })} rows={2} dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.speakersForm.bioAr}</Label>
                <Textarea value={form.bioAr} onChange={(e) => setForm({ ...form, bioAr: e.target.value })} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.speakersForm.bioFr}</Label>
                <Textarea value={form.bioFr} onChange={(e) => setForm({ ...form, bioFr: e.target.value })} rows={3} dir="ltr" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                {t.common.active}
              </label>
            </div>
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
