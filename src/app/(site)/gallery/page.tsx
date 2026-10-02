"use client";

import React, { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import Lightbox from "@/components/shared/lightbox";
import { ImageIcon, Play, Images } from "lucide-react";

interface MediaItem {
  id: string;
  title: string;
  titleFr: string;
  type: "image" | "video";
  data: string;
  uploadedAt: string;
}

export default function GalleryPage() {
  const { t, lang } = useLang();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [selected, setSelected] = useState<MediaItem | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/media", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setItems(d.media || []))
        .catch(() => {});
    load();
    const iv = setInterval(load, 90000); // Task 19: gentler poll (edge-cached)
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="relative min-h-[70vh] py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="section-line mx-auto text-3xl font-black sm:text-4xl">{t.nav.gallery}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{lang === "ar" ? "ذكريات ولحظات من عالم المخيم" : "Souvenirs et moments du camp"}</p>
        </div>

        {items === null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="shimmer aspect-square rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mx-auto max-w-md rounded-[2rem] border border-dashed border-brand/40 bg-card p-10 text-center">
            <Images className="mx-auto h-14 w-14 text-brand/50" />
            <p className="mt-4 font-bold text-muted-foreground">{t.common.noData}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{t.admin.media.uploadHint}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((m, i) => (
              <Card
                key={m.id}
                className="card-glow group cursor-pointer overflow-hidden border-0 p-0"
                style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                onClick={() => setSelected(m)}
              >
                <div className="relative aspect-square overflow-hidden">
                  {m.type === "image" ? (
                    <img
                      src={m.data}
                      alt={lang === "ar" ? m.title : m.titleFr || m.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/20 to-brand-2/20">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl transition-transform group-hover:scale-110">
                        <Play className="h-6 w-6 fill-white" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <p className="line-clamp-1 text-xs font-bold text-white">
                      {lang === "ar" ? m.title : m.titleFr || m.title}
                    </p>
                  </div>
                  <span className="absolute end-2 top-2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur">
                    {m.type === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Videos open in a dialog with native controls */}
      <Dialog open={!!selected && selected.type === "video"} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="px-3 pt-2 text-sm font-bold">
            {selected ? (lang === "ar" ? selected.title : selected.titleFr || selected.title) : ""}
          </DialogTitle>
          {selected && selected.type === "video" ? (
            <video src={selected.data} controls className="max-h-[75vh] w-full rounded-xl" />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Images open in the full-screen zoomable lightbox (conditional mount) */}
      {selected && selected.type === "image" ? (
        <Lightbox
          src={selected.data}
          alt={selected.title}
          caption={lang === "ar" ? selected.title : selected.titleFr || selected.title}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
