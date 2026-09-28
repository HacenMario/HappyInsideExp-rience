"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2, HelpCircle } from "lucide-react";

interface Faq {
  _id: string;
  questionAr: string;
  questionFr: string;
  answerAr: string;
  answerFr: string;
  order: number;
  active: boolean;
}

const emptyForm = { questionAr: "", questionFr: "", answerAr: "", answerFr: "", order: 99, active: true };

export default function FaqTab() {
  const { t } = useLang();
  const { toast } = useToast();
  const [list, setList] = useState<Faq[] | null>(null);
  const [form, setForm] = useState<typeof emptyForm & { _id?: string }>(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/faq", { cache: "no-store" });
    const data = await res.json();
    if (!data.error) setList(data.faqs);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const { _id, ...rest } = form;
      const res = await fetch("/api/admin/faq", {
        method: _id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(_id ? { id: _id, ...rest } : rest),
      });
      if (res.ok) {
        toast({ title: t.admin.faqAdmin.saved });
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
    const res = await fetch(`/api/admin/faq?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: t.common.success });
      await load();
    }
  };

  return (
    <div className="space-y-5">
      <Card className="card-glow border-0 p-0">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-black">
              <HelpCircle className="h-5 w-5 text-brand" />
              {t.admin.tabs.faq}
            </h2>
            <Button
              size="sm"
              className="rounded-full font-bold shadow-md shadow-brand/25"
              onClick={() => {
                setForm(emptyForm);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> {t.admin.faqAdmin.new}
            </Button>
          </div>

          {list === null ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="shimmer h-14 rounded-xl" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.common.noData}</p>
          ) : (
            <div className="scroll-area max-h-[55vh] space-y-2.5 overflow-y-auto pe-1">
              {list.map((f) => (
                <div key={f._id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold">{f.questionAr}</p>
                      <p className="truncate text-xs text-muted-foreground" dir="ltr">{f.questionFr}</p>
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{f.answerAr}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setForm({ ...f });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del(f._id)}>
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
            <h3 className="mb-4 text-base font-black">{form._id ? t.admin.annForm.edit : t.admin.faqAdmin.new}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t.admin.faqAdmin.questionAr}</Label>
                <Input value={form.questionAr} onChange={(e) => setForm({ ...form, questionAr: e.target.value })} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.faqAdmin.questionFr}</Label>
                <Input value={form.questionFr} onChange={(e) => setForm({ ...form, questionFr: e.target.value })} className="h-10" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.faqAdmin.answerAr}</Label>
                <Textarea value={form.answerAr} onChange={(e) => setForm({ ...form, answerAr: e.target.value })} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.faqAdmin.answerFr}</Label>
                <Textarea value={form.answerFr} onChange={(e) => setForm({ ...form, answerFr: e.target.value })} rows={3} dir="ltr" />
              </div>
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
