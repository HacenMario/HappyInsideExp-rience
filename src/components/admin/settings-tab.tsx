"use client";

import React, { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LogoMark } from "@/components/shared/logo";
import MapPicker from "@/components/admin/map-picker";
import {
  Loader2,
  Save,
  Settings2,
  ImagePlus,
  RotateCcw,
  Images,
  MapPin,
} from "lucide-react";
import { fileToDataUrl } from "@/lib/image-client";

interface Settings {
  edition: number;
  nameEn: string;
  sloganAr: string;
  sloganFr: string;
  descAr: string;
  descFr: string;
  locationAr: string;
  locationFr: string;
  startDate: string;
  endDate: string;
  totalSeats: number;
  registrationOpen: boolean;
  fee: number;
  studentFee: number;
  logo: string | null;
  heroImage?: string | null;
  programImage1?: string | null;
  programImage2?: string | null;
  whatsappNumber: string;
  email: string;
  facebookUrl: string;
  instagramUrl: string;
  mapLat?: number | null; // Task 21 — camp pin
  mapLng?: number | null; // Task 21 — camp pin
  announcementBarActive: boolean;
  announcementBarFloating: boolean;
  announcementBarTextAr: string;
  announcementBarTextFr: string;
  announcementBarLink: string;
}

/* Field lives at MODULE scope on purpose: defining it inside the component
   recreated the component type on every keystroke, which remounted the
   <Input> and dropped focus after each character (the "one letter at a
   time" bug). */
function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={"space-y-1.5 " + (full ? "sm:col-span-2" : "")}>
      <Label className="text-xs font-bold">{label}</Label>
      {children}
    </div>
  );
}

/* One uploadable image slot (hero / poster / detailed program).
   MODULE scope on purpose — same reasoning as Field above. */
function ImageSlot({
  label,
  hint,
  value,
  fallbackSrc,
  busy,
  onChange,
  onReset,
  t,
}: {
  label: string;
  hint?: string;
  value: string | null | undefined;
  fallbackSrc: string;
  busy: boolean;
  onChange: (file: File | undefined) => void;
  onReset: () => void;
  t: {
    change: string;
    logoReset: string;
  };
}) {
  const preview = value || fallbackSrc;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black">{label}</p>
          {hint ? <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
        </div>
        {busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" /> : null}
      </div>
      <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
        { }
        <img src={preview} alt={label} className="mx-auto max-h-44 w-full object-contain" loading="lazy" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-xl border-2 border-dashed border-brand/40 px-3 py-1.5 text-[11px] font-bold text-brand transition-colors hover:bg-brand/5">
          {t.change}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onChange(e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
        </label>
        {value ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={busy}
            className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            {t.logoReset}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function SettingsTab() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings)
          setForm((f) => ({
            fee: 0,
            studentFee: 0,
            logo: null,
            ...d.settings,
            ...(f && f.logo && !d.settings.logo ? { logo: f.logo } : {}),
          }));
      })
      .catch(() => {});
  }, []);

  if (!form) {
    return <div className="shimmer h-96 rounded-2xl" />;
  }

  const set = (k: keyof Settings, v: unknown) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async (overrides?: Partial<Settings>, successMsg?: string) => {
    setSaving(true);
    try {
      const payload = { ...form, ...overrides };
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setForm((f) => (f ? { ...f, ...data.settings } : f));
        }
        toast({ title: successMsg || t.admin.settings.saved });
        window.dispatchEvent(new CustomEvent("camp-settings-updated"));
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const onLogoChange = async (file: File | undefined) => {
    if (!file) return;
    setLogoBusy(true);
    try {
      // Compressed in-browser — logos stay crisp but tiny (≤ ~400 KB), so
      // requests remain far below cloud request-size limits (Vercel 4.5 MB).
      const dataUrl = await fileToDataUrl(file, { maxDim: 512, quality: 0.9, maxBytes: 400 * 1024 });
      await save({ logo: dataUrl }, t.admin.settings.logoSaved);
    } finally {
      setLogoBusy(false);
    }
  };

  const resetLogo = async () => {
    setLogoBusy(true);
    await save({ logo: null }, t.admin.settings.logoSaved);
    setLogoBusy(false);
  };

  /* Landing / program images: compressed in-browser before saving so the
     request stays far below the 4.5 MB Vercel limit and the 16 MB MongoDB
     document limit. Instant save on selection. */
  const onImageChange = async (field: "heroImage" | "programImage1" | "programImage2", file: File | undefined) => {
    if (!file) return;
    setImageBusy(field);
    try {
      const dataUrl = await fileToDataUrl(file, { maxDim: 1800, quality: 0.82, maxBytes: 1.2 * 1024 * 1024 });
      if (dataUrl.length > 8 * 1024 * 1024) {
        toast({ title: t.common.error, description: t.admin.settings.imageTooLarge, variant: "destructive" });
        return;
      }
      await save({ [field]: dataUrl } as Partial<Settings>, t.admin.settings.imageSaved);
    } finally {
      setImageBusy(null);
    }
  };

  const onImageReset = async (field: "heroImage" | "programImage1" | "programImage2") => {
    setImageBusy(field);
    await save({ [field]: null } as Partial<Settings>, t.admin.settings.imageReset);
    setImageBusy(null);
  };

  return (
    <div className="space-y-5">
      {/* Identity: logo + slogan */}
      <Card className="card-glow border-0 p-0">
        <CardContent className="p-6">
          <h2 className="mb-5 flex items-center gap-2 text-base font-black">
            <ImagePlus className="h-5 w-5 text-brand-3" />
            {lang === "ar" ? "هوية المخيم" : "Identité du camp"}
          </h2>
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <LogoMark size={88} className="rounded-2xl border border-border shadow-lg" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="cursor-pointer rounded-xl border-2 border-dashed border-brand/40 px-3 py-1.5 text-center text-[11px] font-bold text-brand transition-colors hover:bg-brand/5">
                  {logoBusy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : lang === "ar" ? "تغيير اللوغو" : "Changer le logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      onLogoChange(e.target.files?.[0]);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {form.logo ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetLogo}
                    disabled={logoBusy}
                    className="h-7 gap-1 text-[11px] text-muted-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t.admin.settings.logoReset}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="flex-1 space-y-4 self-stretch">
              <p className="text-xs leading-relaxed text-muted-foreground">{t.admin.settings.logoHint}</p>
              <Field label={t.admin.settings.sloganAr}>
                <Input value={form.sloganAr} onChange={(e) => set("sloganAr", e.target.value)} className="h-10" />
              </Field>
              <Field label={t.admin.settings.sloganFr}>
                <Input value={form.sloganFr} onChange={(e) => set("sloganFr", e.target.value)} className="h-10" dir="ltr" />
              </Field>
              <p className="text-[11px] text-muted-foreground">
                {lang === "ar"
                  ? "يظهر الشعار تحت اسم المخيم في الترويسة، القائمة الجانبية، والفوتر."
                  : "Le slogan apparaît sous le nom du camp dans l'en-tête, le menu latéral et le pied de page."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Home page images: hero + program poster + detailed program */}
      <Card className="card-glow border-0 p-0">
        <CardContent className="p-6">
          <h2 className="mb-1 flex items-center gap-2 text-base font-black">
            <Images className="h-5 w-5 text-brand-2" />
            {t.admin.settings.imagesTitle}
          </h2>
          <p className="mb-5 text-xs text-muted-foreground">{t.admin.settings.imagesHint}</p>
          <div className="grid gap-4 lg:grid-cols-3">
            <ImageSlot
              label={t.admin.settings.heroImage}
              hint={t.admin.settings.heroImageHint}
              value={form.heroImage}
              fallbackSrc="/images/hero.png"
              busy={imageBusy === "heroImage"}
              onChange={(f) => onImageChange("heroImage", f)}
              onReset={() => onImageReset("heroImage")}
              t={t.admin.settings}
            />
            <ImageSlot
              label={t.admin.settings.programPoster}
              value={form.programImage1}
              fallbackSrc="/images/program-poster.jpg"
              busy={imageBusy === "programImage1"}
              onChange={(f) => onImageChange("programImage1", f)}
              onReset={() => onImageReset("programImage1")}
              t={t.admin.settings}
            />
            <ImageSlot
              label={t.admin.settings.programDetails}
              value={form.programImage2}
              fallbackSrc="/images/program-details.jpg"
              busy={imageBusy === "programImage2"}
              onChange={(f) => onImageChange("programImage2", f)}
              onReset={() => onImageReset("programImage2")}
              t={t.admin.settings}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="card-glow border-0 p-0">
        <CardContent className="p-6">
          <h2 className="mb-5 flex items-center gap-2 text-base font-black">
            <Settings2 className="h-5 w-5 text-brand" />
            {t.admin.settings.title}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.admin.settings.campName}>
              <Input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} className="h-10" dir="ltr" />
            </Field>
            <Field label={t.admin.settings.edition}>
              <Input
                type="number"
                value={form.edition}
                onChange={(e) => set("edition", parseInt(e.target.value) || 1)}
                className="h-10"
                min={1}
              />
            </Field>
            <Field label={t.admin.settings.descAr} full>
              <Textarea value={form.descAr} onChange={(e) => set("descAr", e.target.value)} rows={3} />
            </Field>
            <Field label={t.admin.settings.descFr} full>
              <Textarea value={form.descFr} onChange={(e) => set("descFr", e.target.value)} rows={3} dir="ltr" />
            </Field>
            <Field label={t.admin.settings.locationAr}>
              <Input value={form.locationAr} onChange={(e) => set("locationAr", e.target.value)} className="h-10" />
            </Field>
            <Field label={t.admin.settings.locationFr}>
              <Input value={form.locationFr} onChange={(e) => set("locationFr", e.target.value)} className="h-10" dir="ltr" />
            </Field>
            <Field label={t.admin.settings.startDate}>
              <Input
                type="datetime-local"
                value={(form.startDate || "").slice(0, 16)}
                onChange={(e) => set("startDate", new Date(e.target.value).toISOString())}
                className="h-10"
              />
            </Field>
            <Field label={t.admin.settings.endDate}>
              <Input
                type="datetime-local"
                value={(form.endDate || "").slice(0, 16)}
                onChange={(e) => set("endDate", new Date(e.target.value).toISOString())}
                className="h-10"
              />
            </Field>
            <Field label={t.admin.settings.totalSeats}>
              <Input
                type="number"
                value={form.totalSeats}
                onChange={(e) => set("totalSeats", parseInt(e.target.value) || 0)}
                className="h-10"
                min={1}
              />
            </Field>
            <Field label={t.admin.settings.fee}>
              <Input
                type="number"
                value={form.fee ?? 0}
                onChange={(e) => set("fee", Math.max(0, parseInt(e.target.value) || 0))}
                className="h-10"
                min={0}
                step={100}
              />
            </Field>
            <Field label={t.admin.settings.studentFee}>
              <Input
                type="number"
                value={form.studentFee ?? 0}
                onChange={(e) => set("studentFee", Math.max(0, parseInt(e.target.value) || 0))}
                className="h-10"
                min={0}
                step={100}
              />
            </Field>
            <div className="sm:col-span-2">
              <p className="text-[11px] text-muted-foreground">{t.admin.settings.feeHint}</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5">
              <Label className="cursor-pointer text-xs font-bold">{t.admin.settings.regOpen}</Label>
              <Switch checked={form.registrationOpen} onCheckedChange={(v) => set("registrationOpen", v)} />
            </div>
            <Field label={t.admin.settings.whatsapp}>
              <Input
                value={form.whatsappNumber}
                onChange={(e) => set("whatsappNumber", e.target.value.replace(/\D/g, ""))}
                className="h-10"
                dir="ltr"
                placeholder="213550000000"
              />
            </Field>
            <Field label={t.admin.settings.email}>
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} className="h-10" dir="ltr" />
            </Field>
            <Field label={t.admin.settings.facebook}>
              <Input value={form.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} className="h-10" dir="ltr" />
            </Field>
            <Field label={t.admin.settings.instagram}>
              <Input value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} className="h-10" dir="ltr" />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Camp location on the map (Task 21) */}
      <Card className="card-glow border-0 p-0">
        <CardContent className="p-6">
          <h2 className="mb-1 flex items-center gap-2 text-base font-black">
            <MapPin className="h-5 w-5 text-brand-3" />
            {t.map.title}
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">{t.map.adminHint}</p>
          <MapPicker
            lat={form.mapLat ?? null}
            lng={form.mapLng ?? null}
            onChange={(la, ln) =>
              setForm((f) => (f ? { ...f, mapLat: la, mapLng: ln } : f))
            }
          />
          <p className="mt-3 text-[11px] font-semibold text-muted-foreground">{t.map.adminSaveHint}</p>
        </CardContent>
      </Card>

      {/* Announcement bar settings */}
      <Card className="card-glow border-0 p-0">
        <CardContent className="p-6">
          <h2 className="mb-5 flex items-center gap-2 text-base font-black">
            📢 {lang === "ar" ? "شريط الإعلانات" : "Barre d'annonces"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5">
              <Label className="cursor-pointer text-xs font-bold">{t.admin.settings.barActive}</Label>
              <Switch checked={form.announcementBarActive} onCheckedChange={(v) => set("announcementBarActive", v)} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5">
              <Label className="cursor-pointer text-xs font-bold">{t.admin.settings.barFloating}</Label>
              <Switch checked={form.announcementBarFloating} onCheckedChange={(v) => set("announcementBarFloating", v)} />
            </div>
            <Field label={t.admin.settings.barTextAr} full>
              <Input value={form.announcementBarTextAr} onChange={(e) => set("announcementBarTextAr", e.target.value)} className="h-10" />
            </Field>
            <Field label={t.admin.settings.barTextFr} full>
              <Input value={form.announcementBarTextFr} onChange={(e) => set("announcementBarTextFr", e.target.value)} className="h-10" dir="ltr" />
            </Field>
            <Field label={t.admin.settings.barLink} full>
              <Input value={form.announcementBarLink} onChange={(e) => set("announcementBarLink", e.target.value)} className="h-10" dir="ltr" placeholder="/register" />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => save()} disabled={saving} className="h-12 w-full rounded-xl font-extrabold shadow-lg shadow-brand/25 sm:w-auto sm:px-12">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? t.common.saving : t.common.save}
      </Button>
    </div>
  );
}
