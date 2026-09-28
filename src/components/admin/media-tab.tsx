"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/i18n/context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Upload, Video, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { fileToDataUrl } from "@/lib/image-client";

interface MediaItem {
  id: string;
  title: string;
  type: "image" | "video";
  data: string;
  size: number;
  uploadedAt: string;
}

const MAX_SIZE = 25 * 1024 * 1024; // 25MB per file (matches the API)

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MediaTab() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/media", { cache: "no-store" });
    const data = await res.json();
    if (!data.error) setItems(data.media);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(load);
    return () => cancelAnimationFrame(id);
  }, [load]);

  /* Batch upload: several files selected at once, uploaded sequentially so we
     can show n/m progress and keep request sizes small. */
  const upload = async () => {
    if (files.length === 0 || uploading) return;
    setUploading(true);
    setProgress({ done: 0, total: files.length, failed: 0 });
    let ok = 0;
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (file.size > MAX_SIZE) {
          failed++;
        } else {
          const isVideo = file.type.startsWith("video/");
          const type: "image" | "video" = isVideo ? "video" : "image";
          // Images are compressed in-browser (≈<1MB) so uploads stay within
          // Vercel's 4.5 MB request limit on any hosting platform.
          const dataUrl = isVideo
            ? await readAsDataURL(file)
            : await fileToDataUrl(file, { maxDim: 1800, quality: 0.82, maxBytes: 1.2 * 1024 * 1024 });
          // Use the typed title as prefix, fallback to the file name
          const baseTitle = title || file.name.replace(/\.[^.]+$/, "") || (lang === "ar" ? "وسائط المخيم" : "Média du camp");
          const itemTitle = files.length > 1 ? `${baseTitle} — ${i + 1}` : baseTitle;
          const res = await fetch("/api/admin/media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: itemTitle, type, data: dataUrl }),
          });
          if (res.ok) ok++;
          else failed++;
        }
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: files.length, failed });
    }
    if (ok > 0) {
      toast({
        title: t.admin.media.uploadedSome,
        description: `${ok}/${files.length}`,
      });
      setTitle("");
      await load();
    } else {
      toast({
        title: t.common.error,
        description: t.admin.media.maxNote,
        variant: "destructive",
      });
    }
    setFiles([]);
    setProgress(null);
    setUploading(false);
  };

  /* Single delete — called after the confirmation dialog */
  const del = async (m: MediaItem) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/media?id=${m.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: t.admin.media.deleted });
        await load();
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  /* Wipe the whole gallery — called after the confirmation dialog */
  const delAll = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/media?all=true", { method: "DELETE" });
      if (res.ok) {
        const d = await res.json().catch(() => ({}));
        toast({ title: t.admin.media.deletedAll, description: d.deleted ? `${d.deleted} ${t.admin.media.items}` : undefined });
        await load();
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    } finally {
      setDeleting(false);
      setDeleteAllOpen(false);
    }
  };

  const count = items?.length ?? 0;

  return (
    <div className="space-y-5">
      {/* Upload */}
      <Card className="card-glow border-0 p-0">
        <CardContent className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-black">
            <Upload className="h-5 w-5 text-brand" />
            {t.admin.media.upload}
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">{t.admin.media.uploadHint} — {t.admin.media.maxNote}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{t.admin.annForm.titleAr}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>{lang === "ar" ? "الملفات" : "Fichiers"}</Label>
              <div className="flex gap-2">
                <label className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/40 px-3 text-xs font-bold text-brand transition-colors hover:bg-brand/5">
                  {files.length === 0 ? (
                    <>{t.admin.media.selectFiles}</>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {files.length} {lang === "ar" ? "ملف(ات) محددة" : "fichier(s)"}
                    </>
                  )}
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      setFiles(Array.from(e.target.files || []));
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{lang === "ar" ? "الرفع" : "Envoi"}</Label>
              <Button onClick={upload} disabled={files.length === 0 || uploading} className="h-10 w-full gap-2 rounded-xl px-4 font-bold">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading && progress
                  ? `${t.admin.media.uploadingN} ${progress.done}/${progress.total}`
                  : lang === "ar"
                    ? `رفع${files.length > 1 ? ` (${files.length})` : ""}`
                    : `Envoyer${files.length > 1 ? ` (${files.length})` : ""}`}
              </Button>
            </div>
          </div>

          {/* Batch progress list */}
          {progress ? (
            <div className="mt-4 space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-300"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <span
                    key={i}
                    className={
                      "inline-flex max-w-48 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold " +
                      (i < progress.done - progress.failed
                        ? "border-brand/40 bg-brand/10 text-brand"
                        : i < progress.done
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : "border-border text-muted-foreground")
                    }
                  >
                    {i < progress.done - progress.failed ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : i < progress.done ? (
                      <XCircle className="h-3 w-3" />
                    ) : (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    <span className="truncate">{f.name}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-3 text-[11px] text-muted-foreground">
            {lang === "ar"
              ? "النوع (صورة/فيديو) يُكتشف تلقائياً من نوع الملف، وإذا تركت العنوان فارغاً يُستخدم اسم الملف."
              : "Le type (image/vidéo) est détecté automatiquement ; si le titre est vide, le nom du fichier est utilisé."}
          </p>
        </CardContent>
      </Card>

      {/* Gallery */}
      <Card className="card-glow border-0 p-0">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-black">
              {t.admin.media.title}
              {items ? (
                <Badge variant="secondary" className="tabular-nums">
                  {count} {t.admin.media.items}
                </Badge>
              ) : null}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteAllOpen(true)}
              disabled={count === 0 || deleting}
              className="h-9 gap-1.5 rounded-xl border-destructive/40 px-3 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t.admin.media.deleteAll}
            </Button>
          </div>
          {items === null ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="shimmer aspect-square rounded-2xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.common.noData}</p>
          ) : (
            <div className="scroll-area grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto pe-1 sm:grid-cols-4">
              {items.map((m) => (
                <div key={m.id} className="group relative overflow-hidden rounded-2xl border border-border">
                  <div className="aspect-square">
                    {m.type === "image" ? (
                      <img src={m.data} alt={m.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/20 to-brand-2/20">
                        <Video className="h-8 w-8 text-brand-2" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent p-2">
                    <span className="line-clamp-1 text-[10px] font-bold text-white">{m.title}</span>
                    {/* Always visible on touch devices (no hover there),
                        appears on hover on desktop — 32px+ hit target */}
                    <button
                      onClick={() => setPendingDelete(m)}
                      disabled={deleting}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/95 text-white shadow-md transition-all hover:scale-110 hover:bg-destructive disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label={t.common.delete + " — " + m.title}
                      title={t.common.delete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm single delete */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.media.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.media.confirmDeleteBody}
              {pendingDelete ? (
                <span className="mt-2 block font-bold">{pendingDelete.title}</span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) del(pendingDelete);
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete-all */}
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.media.deleteAllTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.media.deleteAllBody}
              {count > 0 ? (
                <span className="mt-2 block font-bold">{count} {t.admin.media.items}</span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                delAll();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t.admin.media.deleteAll}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
