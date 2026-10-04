"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session-context";
import { useLang } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LogoSkeleton } from "@/components/shared/logo";
import Lightbox from "@/components/shared/lightbox";
import { fileToDataUrl } from "@/lib/image-client";
import { toast } from "@/hooks/use-toast";
import {
  Camera,
  Images,
  ImagePlus,
  Loader2,
  Send,
  Trash2,
  Hourglass,
  CircleCheck,
  CircleX,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
 * /memories (Task 20) — SHARED MEMORIES ALBUM
 * Public masonry gallery of approved participant photos (masked
 * author + caption + lightbox). Logged-in participants get an
 * upload card (browser-compressed → admin moderation) and a
 * "my submissions" strip with status chips + delete.
 * ============================================================ */

interface MemoryItem {
  id: string;
  author: string;
  caption: string;
  data: string;
  mimeType: string;
  createdAt: string;
}
interface MyMemory {
  id: string;
  caption: string;
  data: string;
  mimeType: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export default function MemoriesPage() {
  return (
    <Suspense fallback={<LogoSkeleton label="..." />}>
      <MemoriesInner />
    </Suspense>
  );
}

function MemoriesInner() {
  const { t } = useLang();
  const { user } = useSession();

  const [items, setItems] = useState<MemoryItem[] | null>(null);
  const [mine, setMine] = useState<MyMemory[]>([]);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string; caption?: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/memories")
      .then((r) => r.json())
      .then((d) => setItems(d.memories || []))
      .catch(() => setItems([]));
  }, []);

  const loadMine = useCallback(() => {
    if (!user || user.role === "admin") {
      setMine([]);
      return;
    }
    fetch("/api/memories?mine=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { mine: [] }))
      .then((d) => setMine(d.mine || []))
      .catch(() => setMine([]));
  }, [user]);

  useEffect(() => {
    load();
    loadMine();
  }, [load, loadMine]);

  const isParticipant = !!user && user.role !== "admin";

  return (
    <div className="relative min-h-[80vh] py-10">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-30" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* header */}
        <div className="mb-8 text-center">
          <Badge className="mb-3 border-brand/40 bg-brand/10 px-3.5 py-1.5 text-xs font-black text-brand">
            <Camera className="me-1.5 h-3.5 w-3.5" />
            {t.alumni.badge}
          </Badge>
          <h1 className="text-2xl font-black sm:text-3xl">{t.memories.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t.memories.subtitle}</p>
        </div>

        {/* upload card (participants only) */}
        {isParticipant ? (
          <UploadCard onSubmitted={() => { loadMine(); }} />
        ) : (
          <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-border/70 bg-muted/30 p-4 text-center text-[13px] font-bold text-muted-foreground">
            {t.memories.loginToUpload}
          </div>
        )}

        {/* my submissions */}
        {isParticipant && mine.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-base font-black">
              <Images className="h-4 w-4 text-brand" />
              {t.memories.myMemories}
              <span className="text-[11px] font-bold text-muted-foreground">({mine.length})</span>
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {mine.map((m) => (
                <div
                  key={m.id}
                  className="relative w-36 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
                >
                  <img
                    src={m.data}
                    alt={m.caption || ""}
                    className="h-28 w-full cursor-pointer object-cover"
                    onClick={() => setLightbox({ src: m.data, alt: m.caption || "", caption: m.caption })}
                  />
                  <div className="flex items-center justify-between gap-1 p-2">
                    <StatusChip status={m.status} />
                    {m.status !== "approved" ? (
                      <button
                        onClick={async () => {
                          try {
                            const r = await fetch("/api/memories", {
                              method: "DELETE",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: m.id }),
                            });
                            if (!r.ok) throw new Error();
                            toast({ title: t.memories.deleted });
                            loadMine();
                          } catch {
                            toast({ title: t.memories.errorGeneric, variant: "destructive" });
                          }
                        }}
                        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t.memories.deleteMine}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* public album */}
        <section>
          <div className="mb-4 flex items-center justify-center gap-2 text-[11px] font-bold text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            {t.memories.moderationNote}
          </div>

          {items === null ? (
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="shimmer mb-3 h-44 break-inside-avoid rounded-2xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center">
              <Camera className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-bold text-muted-foreground">{t.memories.empty}</p>
            </div>
          ) : (
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
              {items.map((m) => (
                <figure
                  key={m.id}
                  className="memories-card group mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <img
                    src={m.data}
                    alt={m.caption || ""}
                    loading="lazy"
                    className="w-full cursor-zoom-in object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    onClick={() =>
                      setLightbox({
                        src: m.data,
                        alt: m.caption || "",
                        caption: `${t.memories.by} ${m.author}${m.caption ? ` — ${m.caption}` : ""}`,
                      })
                    }
                  />
                  {m.caption || m.author ? (
                    <figcaption className="p-2.5">
                      {m.caption ? (
                        <p className="truncate text-[12px] font-black leading-snug">{m.caption}</p>
                      ) : null}
                      <p className="mt-0.5 text-[10px] font-bold text-muted-foreground">
                        {t.memories.by} {m.author}
                      </p>
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          )}
        </section>
      </div>

      {lightbox ? (
        <Lightbox src={lightbox.src} alt={lightbox.alt} caption={lightbox.caption} onClose={() => setLightbox(null)} />
      ) : null}
    </div>
  );
}

function StatusChip({ status }: { status: MyMemory["status"] }) {
  const { t } = useLang();
  const map = {
    pending: { label: t.memories.pendingChip, cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400", icon: <Hourglass className="h-3 w-3" /> },
    approved: { label: t.memories.approvedChip, cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", icon: <CircleCheck className="h-3 w-3" /> },
    rejected: { label: t.memories.rejectedChip, cls: "bg-destructive/15 text-destructive", icon: <CircleX className="h-3 w-3" /> },
  } as const;
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black", s.cls)}>
      {s.icon}
      {s.label}
    </span>
  );
}

function UploadCard({ onSubmitted }: { onSubmitted: () => void }) {
  const { t } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const pick = async (f: File | null) => {
    if (!f) return;
    setFile(f);
    try {
      // compress via the shared browser pipeline (same as admin media upload)
      const dataUrl = await fileToDataUrl(f, { maxDim: 1600, quality: 0.8, maxBytes: 1_200_000 });
      setPreview(dataUrl);
    } catch {
      setPreview("");
    }
  };

  const submit = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: preview, caption }),
      });
      if (res.status === 413) throw new Error("too_large");
      if (!res.ok) throw new Error("generic");
      toast({ title: t.memories.submitted });
      setFile(null);
      setPreview("");
      setCaption("");
      onSubmitted();
    } catch (e) {
      toast({
        title: (e as Error).message === "too_large" ? t.memories.errorTooLarge : t.memories.errorGeneric,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-glow relative mb-8 overflow-hidden p-6">
      <div className="blob end-8 top-6 h-20 w-20 bg-brand/25" />
      <h2 className="mb-1 flex items-center gap-2 text-lg font-black">
        <ImagePlus className="h-5 w-5 text-brand" />
        {t.memories.uploadTitle}
      </h2>
      <p className="mb-4 text-xs font-semibold text-muted-foreground">{t.memories.uploadDesc}</p>

      <div className="flex flex-col gap-4 sm:flex-row">
        {/* picker / preview */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-brand/40 bg-brand/5 transition-colors hover:border-brand/70 hover:bg-brand/10 sm:h-36 sm:w-52"
          aria-label={t.memories.chooseImage}
        >
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-brand">
              <ImagePlus className="h-7 w-7 transition-transform group-hover:scale-110" />
              <span className="text-[11px] font-black">{t.memories.chooseImage}</span>
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] || null)}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
            placeholder={t.memories.captionPh}
            className="rounded-xl font-bold"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={submit}
              disabled={!preview || busy}
              className="h-11 rounded-xl bg-brand font-extrabold shadow-md shadow-brand/30 hover:bg-brand/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy ? t.memories.uploading : t.memories.upload}
            </Button>
            <span className="text-[10px] font-bold text-muted-foreground">{t.memories.limitNote}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
