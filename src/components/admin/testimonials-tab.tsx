"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { WilayaSelect } from "@/components/shared/wilaya-select";
import { fileToDataUrl } from "@/lib/image-client";
import {
  Loader2,
  MessageSquareHeart,
  Plus,
  Star,
  Trash2,
  Pencil,
  LogOut,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
 * Admin tab "آراء المشاركين" (Task 21) — the admin documents the
 * participants' opinions about the camp; active ones appear on the
 * public /testimonials page.
 * ============================================================ */

interface Testimonial {
  id: string;
  name: string;
  accountType: "student" | "specialist";
  wilaya: string;
  rating: number;
  textAr: string;
  textFr: string;
  avatar: string | null;
  active: boolean;
  createdAt: string;
}

interface FormState {
  name: string;
  accountType: "student" | "specialist";
  wilaya: string;
  rating: number;
  textAr: string;
  textFr: string;
  avatar: string | null;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  accountType: "specialist",
  wilaya: "",
  rating: 5,
  textAr: "",
  textFr: "",
  avatar: null,
  active: true,
};

export default function TestimonialsTab() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const a = t.admin.testimonials;

  const [items, setItems] = useState<Testimonial[] | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetch("/api/admin/testimonials", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.testimonials || []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof FormState, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const onAvatar = async (file: File | undefined) => {
    if (!file) return;
    setAvatarBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file, { maxDim: 256, quality: 0.85, maxBytes: 150_000 });
      set("avatar", dataUrl);
    } catch {
      /* ignore */
    } finally {
      setAvatarBusy(false);
    }
  };

  const submit = async () => {
    if (!form.name.trim() || !form.textAr.trim()) {
      toast({ title: a.needNameText, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const url = editingId ? "/api/admin/testimonials?id=" + editingId : "/api/admin/testimonials";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast({ title: editingId ? a.updated : a.added });
      resetForm();
      load();
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (x: Testimonial) => {
    setEditingId(x.id);
    setForm({
      name: x.name,
      accountType: x.accountType,
      wilaya: x.wilaya,
      rating: x.rating,
      textAr: x.textAr,
      textFr: x.textFr,
      avatar: x.avatar,
      active: x.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActive = async (x: Testimonial) => {
    setItems((prev) => (prev ? prev.map((i) => (i.id === x.id ? { ...i, active: !i.active } : i)) : prev));
    await fetch("/api/admin/testimonials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: x.id, active: !x.active }),
    }).catch(() => {});
  };

  const remove = async (x: Testimonial) => {
    if (!window.confirm(a.confirmDelete)) return;
    setItems((prev) => (prev ? prev.filter((i) => i.id !== x.id) : prev));
    await fetch("/api/admin/testimonials?id=" + x.id, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="space-y-5">
      {/* add / edit form */}
      <Card className="card-glow border-0 p-0">
        <CardContent className="p-6">
          <h2 className="mb-1 flex items-center gap-2 text-base font-black">
            <MessageSquareHeart className="h-5 w-5 text-brand-3" />
            {editingId ? a.editTitle : a.addTitle}
          </h2>
          <p className="mb-5 text-xs text-muted-foreground">{a.formHint}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{a.name} *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-10" maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{a.category}</Label>
              <div className="flex gap-2">
                {(
                  [
                    { v: "specialist", label: t.common.specialist, icon: Briefcase },
                    { v: "student", label: t.common.student, icon: GraduationCap },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => set("accountType", o.v)}
                    className={cn(
                      "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-colors",
                      form.accountType === o.v
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <o.icon className="h-4 w-4" />
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t.common.wilaya}</Label>
              <WilayaSelect value={form.wilaya} onValueChange={(v) => set("wilaya", v)} placeholder={t.common.wilayaPlaceholder} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{a.rating}</Label>
              <div className="flex h-10 items-center gap-1" role="radiogroup" aria-label={a.rating}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={form.rating === n}
                    aria-label={`${n} / 5`}
                    onClick={() => set("rating", n)}
                    className="rounded-lg p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-6 w-6 testimonial-star",
                        n <= form.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold">{a.textAr} *</Label>
              <Textarea value={form.textAr} onChange={(e) => set("textAr", e.target.value)} rows={3} maxLength={600} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold">{a.textFr}</Label>
              <Textarea value={form.textFr} onChange={(e) => set("textFr", e.target.value)} rows={2} maxLength={600} dir="ltr" />
            </div>

            {/* avatar */}
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
                {form.avatar ? (
                  <img src={form.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <MessageSquareHeart className="h-6 w-6 text-muted-foreground/60" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="cursor-pointer rounded-xl border-2 border-dashed border-brand/40 px-3 py-1.5 text-[11px] font-bold text-brand transition-colors hover:bg-brand/5">
                  {avatarBusy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : a.pickAvatar}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      onAvatar(e.target.files?.[0]);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {form.avatar ? (
                  <button
                    type="button"
                    onClick={() => set("avatar", null)}
                    className="text-start text-[10px] font-bold text-muted-foreground hover:text-destructive"
                  >
                    {t.admin.settings.logoReset}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5">
              <Label className="cursor-pointer text-xs font-bold">{a.active}</Label>
              <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={submit}
              disabled={busy}
              className="h-11 rounded-xl bg-brand font-extrabold shadow-md shadow-brand/30 hover:bg-brand/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? t.common.save : a.add}
            </Button>
            {editingId ? (
              <Button variant="outline" onClick={resetForm} className="h-11 rounded-xl font-bold">
                {t.common.cancel}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* list */}
      <Card className="border-0 p-0">
        <CardContent className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-black">
            {a.listTitle}
            {items ? (
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-black text-brand">({items.length})</span>
            ) : null}
          </h2>
          {items === null ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="shimmer h-24 rounded-2xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm font-bold text-muted-foreground">
              {a.empty}
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((x) => (
                <div
                  key={x.id}
                  className={cn(
                    "rounded-2xl border p-4 transition-colors",
                    x.active ? "border-border bg-card" : "border-dashed border-border/70 bg-muted/40 opacity-80"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand/20 to-brand-2/20 font-black text-brand">
                      {x.avatar ? (
                        <img src={x.avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        x.name.trim().charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="text-sm font-black">{x.name}</p>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {x.accountType === "student" ? t.common.student : t.common.specialist}
                          {x.wilaya ? ` · ${x.wilaya}` : ""}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={cn("h-3 w-3 testimonial-star", n <= x.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                        ))}
                      </div>
                      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {lang === "ar" || !x.textFr ? x.textAr : x.textFr}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                    <button
                      onClick={() => toggleActive(x)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black",
                        x.active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {x.active ? <LogOut className="h-3 w-3 rotate-180" /> : null}
                      {x.active ? a.publishedChip : a.hiddenChip}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => startEdit(x)} className="h-8 gap-1 rounded-lg px-2.5 text-[11px] font-bold">
                        <Pencil className="h-3 w-3" />
                        {t.common.edit}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => remove(x)}
                        className="h-8 gap-1 rounded-lg px-2.5 text-[11px] font-bold text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t.common.delete}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
