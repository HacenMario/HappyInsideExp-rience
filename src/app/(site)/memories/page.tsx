"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/lib/session-context";
import { useLang } from "@/lib/i18n/context";
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
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
 * /memories (Task 20 · redesigned in Task 21) — SHARED MEMORIES
 * ALBUM. Organized in clear sections: hero header with live stats,
 * a polished upload card (drag & drop + guidelines), a two-tab
 * area (published album ↔ my submissions with status chips), and
 * a cinematic masonry grid with lightbox. Full AR/FR + RTL/LTR.
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
  const { t, lang } = useLang();
  const { user } = useSession();

  const [items, setItems] = useState<MemoryItem[] | null>(null);
  const [mine, setMine] = useState<MyMemory[]>([]);
  const [tab, setTab] = useState<"album" | "mine">("album");
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
  const pendingCount = mine.filter((m) => m.status === "pending").length;

  return (
    <div className="relative min-h-[80vh] py-10">
      <div className="hero-mesh absolute inset-0 -z-10 opacity-30" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ============ 1 · HERO HEADER ============ */}
        <header className="mb-8 text-center">
          <Badge className="mb-3 border-brand/40 bg-brand/10 px-3.5 py-1.5 text-xs font-black text-brand">
            <Camera className="me-1.5 h-3.5 w-3.5" />
            {t.memories.badge}
          </Badge>
          <h1 className="text-2xl font-black sm:text-3xl">{t.memories.title}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{t.memories.subtitle}</p>

          {/* live stats strip */}
          <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-black shadow-sm">
              <Images className="h-3.5 w-3.5 text-brand-2" />
              {items ? (
                <>
                  <span className="tabular-nums text-brand">{items.length}</span>
                  <span className="text-muted-foreground">{t.memories.statsPhotos}</span>
                </>
              ) : (
                <span className="shimmer inline-block h-3 w-16 rounded-full" />
              )}
            </span>
            {isParticipant && mine.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-black shadow-sm">
                <ImagePlus className="h-3.5 w-3.5 text-brand-3" />
                <span className="tabular-nums text-brand-3">{mine.length}</span>
                <span className="text-muted-foreground">{t.memories.myMemories}</span>
              </span>
            ) : null}
          </div>
        </header>

        {/* ============ 2 · UPLOAD (participants only) ============ */}
        {isParticipant ? (
          <UploadCard
            onSubmitted={() => {
              loadMine();
              load();
              setTab("mine");
            }}
          />
        ) : (
          <div className="mx-auto mb-8 flex max-w-2xl items-center justify-center gap-2 rounded-2xl border border-border/70 bg-muted/30 p-4 text-center text-[13px] font-bold text-muted-foreground">
            <Sparkles className="h-4 w-4 shrink-0 text-brand" />
            {t.memories.loginToUpload}
          </div>
        )}

        {/* ============ 3 · TABS: ALBUM ↔ MY SUBMISSIONS ============ */}
        <div className="mb-5 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm" role="tablist">
            <button
              role="tab"
              aria-selected={tab === "album"}
              onClick={() => setTab("album")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition-all sm:text-sm",
                tab === "album" ? "bg-gradient-to-r from-brand to-brand-2 text-white shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Images className="h-4 w-4" />
              {t.memories.albumTitle}
              {items ? <span className="tabular-nums opacity-80">({items.length})</span> : null}
            </button>
            {isParticipant ? (
              <button
                role="tab"
                aria-selected={tab === "mine"}
                onClick={() => setTab("mine")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition-all sm:text-sm",
                  tab === "mine" ? "bg-gradient-to-r from-brand-3 to-brand text-white shadow-md" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ImagePlus className="h-4 w-4" />
                {t.memories.myMemories}
                {mine.length > 0 ? <span className="tabular-nums opacity-80">({mine.length})</span> : null}
                {pendingCount > 0 ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-black text-amber-950">
                    {pendingCount}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
        </div>

        {/* ============ 4a · PUBLISHED ALBUM ============ */}
        {tab === "album" ? (
          <section>
            <div className="mb-4 flex items-center justify-center gap-2 text-[11px] font-bold text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              {t.memories.moderationNote}
            </div>

            {items === null ? (
              <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="shimmer mb-3 h-44 break-inside-avoid rounded-2xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-border bg-card/60 p-12 text-center">
                <Camera className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
                <p className="text-sm font-bold text-muted-foreground">{t.memories.empty}</p>
                {isParticipant ? (
                  <p className="mt-1 text-xs font-black text-brand">{t.memories.shareMore} ↑</p>
                ) : null}
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
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-brand/30 to-brand-2/30 text-[8px] font-black text-brand">
                            {m.author.charAt(0)}
                          </span>
                          {t.memories.by} {m.author}
                        </p>
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {/* ============ 4b · MY SUBMISSIONS ============ */}
        {tab === "mine" && isParticipant ? (
          <section>
            {mine.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-border bg-card/60 p-12 text-center">
                <ImagePlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
                <p className="text-sm font-bold text-muted-foreground">{t.memories.shareMore}</p>
                <p className="mt-1 text-xs font-black text-brand">{t.memories.uploadTitle} ↑</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {mine.map((m) => (
                  <div
                    key={m.id}
                    className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <img
                      src={m.data}
                      alt={m.caption || ""}
                      className="h-40 w-full cursor-pointer object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      onClick={() => setLightbox({ src: m.data, alt: m.caption || "", caption: m.caption })}
                    />
                    <div className="flex items-center justify-between gap-1 p-2.5">
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
                          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={t.memories.deleteMine}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                    {m.caption ? (
                      <p className="truncate px-2.5 pb-2 text-[11px] font-bold text-muted-foreground">{m.caption}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>

      {lightbox ? (
        <Lightbox src={lightbox.src} alt={lightbox.alt} caption={lightbox.caption} onClose={() => setLightbox(null)} />
      ) : null}
    </div>
  );
}

/* ---------- status chip (my submissions) ---------- */
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

/* ---------- polished upload card (drag & drop + guidelines) ---------- */
function UploadCard({ onSubmitted }: { onSubmitted: () => void }) {
  const { t } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const pick = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: t.memories.errorGeneric, variant: "destructive" });
      return;
    }
    setFile(f);
    try {
      // compress via the shared browser pipeline (same as admin media upload)
      const dataUrl = await fileToDataUrl(f, { maxDim: 1600, quality: 0.8, maxBytes: 1_200_000 });
      setPreview(dataUrl);
    } catch {
      setPreview("");
    }
  };

  const clearPick = () => {
    setFile(null);
    setPreview("");
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
      setCaption("");
      clearPick();
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

  const guideChips = [
    { icon: <Images className="h-3 w-3" />, label: t.memories.guidelinesFormat },
    { icon: <Sparkles className="h-3 w-3" />, label: t.memories.guidelinesAuto },
    { icon: <Info className="h-3 w-3" />, label: t.memories.guidelinesReview },
  ];

  return (
    <div className="card-glow relative mb-8 overflow-hidden p-5 sm:p-6">
      <div className="blob end-8 top-6 h-20 w-20 bg-brand/25" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black">
            <ImagePlus className="h-5 w-5 text-brand" />
            {t.memories.uploadTitle}
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{t.memories.uploadDesc}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* picker / preview (supports drag & drop) */}
        <div
          className={cn(
            "group relative flex h-44 w-full shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all lg:h-auto lg:w-64",
            dragOver ? "border-brand bg-brand/15" : "border-brand/40 bg-brand/5 hover:border-brand/70 hover:bg-brand/10"
          )}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pick(e.dataTransfer.files?.[0] || null);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
          }}
          aria-label={t.memories.chooseImage}
        >
          {preview ? (
            <>
              <img src={preview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearPick();
                }}
                className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-destructive"
                aria-label={t.memories.removePick}
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <span className={cn("flex flex-col items-center gap-1.5 text-brand transition-colors", dragOver && "text-brand-2")}>
              <ImagePlus className="h-8 w-8 transition-transform group-hover:scale-110" />
              <span className="px-3 text-center text-[11px] font-black leading-snug">
                {dragOver ? t.memories.dropHere : t.memories.chooseImage}
              </span>
            </span>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] || null)}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="relative">
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              placeholder={t.memories.captionPh}
              className="h-11 rounded-xl pe-12 font-bold"
            />
            <span className={cn("absolute end-3 top-1/2 -translate-y-1/2 text-[10px] font-bold tabular-nums", caption.length >= 190 ? "text-destructive" : "text-muted-foreground/70")} dir="ltr">
              {caption.length}/200
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={submit}
              disabled={!preview || busy}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-6 font-extrabold text-white shadow-md shadow-brand/30 transition-all hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />}
              {busy ? t.memories.uploading : t.memories.upload}
            </button>
            <span className="text-[10px] font-bold text-muted-foreground">{t.memories.limitNote}</span>
          </div>
          {/* guidelines */}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {guideChips.map((g, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                {g.icon}
                {g.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
