"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLang } from "@/lib/i18n/context";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Lightbox — full-screen image viewer with real zoom                 */
/*                                                                     */
/*  • Zoom with toolbar buttons / mouse wheel / double-click /         */
/*    two-finger pinch (touch)                                         */
/*  • Drag to pan when zoomed, clamped to the image bounds             */
/*  • Esc closes, +/- zoom, 0 resets, backdrop click closes            */
/*  • Body scroll locked while open, RTL/LTR agnostic                  */
/*                                                                     */
/*  NOTE: the parent must render it conditionally                      */
/*  ({lightbox && <Lightbox/>}) — each mount starts at zoom 1, so no   */
/*  reset-in-effect is needed.                                         */
/* ------------------------------------------------------------------ */

const MIN_SCALE = 1;
const MAX_SCALE = 6;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function Lightbox({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string;
  alt: string;
  caption?: string;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ startDist: number; startScale: number } | null>(null);
  const state = useRef({ scale: 1, offset: { x: 0, y: 0 } });

  /* keep a ref mirror of scale/offset so pointer handlers read fresh values
     without re-binding listeners every render */
  const applyScale = useCallback((s: number, o: { x: number; y: number }) => {
    state.current = { scale: s, offset: o };
    setScale(s);
    setOffset(o);
  }, []);

  /* lock body scroll while open (external-system sync — no setState) */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* measure the clamping bounds for the current scale */
  const boundsFor = useCallback((s: number): { x: number; y: number } => {
    const cont = containerRef.current;
    const img = imgRef.current;
    if (!cont || !img) return { x: 0, y: 0 };
    // clientWidth/Height are layout sizes — CSS transforms don't affect them
    const baseW = img.clientWidth || cont.clientWidth;
    const baseH = img.clientHeight || cont.clientHeight;
    return {
      x: Math.max(0, (baseW * s - cont.clientWidth) / 2),
      y: Math.max(0, (baseH * s - cont.clientHeight) / 2),
    };
  }, []);

  const clampOffset = useCallback(
    (o: { x: number; y: number }, s: number) => {
      const m = boundsFor(s);
      return { x: clamp(o.x, -m.x, m.x), y: clamp(o.y, -m.y, m.y) };
    },
    [boundsFor]
  );

  /* zoom keeping the point under the cursor/finger stationary */
  const zoomAt = useCallback(
    (clientX: number, clientY: number, nextScale: number) => {
      const cont = containerRef.current;
      if (!cont) return;
      const s0 = state.current.scale;
      const s1 = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      const rect = cont.getBoundingClientRect();
      const px = clientX - rect.left - rect.width / 2;
      const py = clientY - rect.top - rect.height / 2;
      const o0 = state.current.offset;
      let o1 = {
        x: px - (s1 / s0) * (px - o0.x),
        y: py - (s1 / s0) * (py - o0.y),
      };
      if (s1 <= 1) o1 = { x: 0, y: 0 };
      else o1 = clampOffset(o1, s1);
      applyScale(s1, o1);
    },
    [applyScale, clampOffset]
  );

  const zoomStep = useCallback(
    (dir: 1 | -1) => {
      const cont = containerRef.current;
      const s0 = state.current.scale;
      const s1 = clamp(s0 * (dir === 1 ? 1.5 : 1 / 1.5), MIN_SCALE, MAX_SCALE);
      // zoom toward the center of the viewport
      if (cont) {
        const r = cont.getBoundingClientRect();
        zoomAt(r.left + r.width / 2, r.top + r.height / 2, s1);
      } else {
        applyScale(s1, state.current.offset);
      }
    },
    [zoomAt, applyScale]
  );

  const reset = useCallback(() => applyScale(1, { x: 0, y: 0 }), [applyScale]);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") zoomStep(1);
      else if (e.key === "-") zoomStep(-1);
      else if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, zoomStep, reset]);

  /* pointer events: 1 pointer = pan, 2 pointers = pinch */
  const onPointerDown = (e: React.PointerEvent) => {
    if (!imgLoaded) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        startScale: state.current.scale,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const target = clamp(pinch.current.startScale * (dist / pinch.current.startDist), MIN_SCALE, MAX_SCALE);
      zoomAt(mid.x, mid.y, target);
      return;
    }

    /* single-pointer pan (only meaningful when zoomed) */
    if (pointers.current.size === 1 && state.current.scale > 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      applyScale(
        state.current.scale,
        clampOffset({ x: state.current.offset.x + dx, y: state.current.offset.y + dy }, state.current.scale)
      );
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!imgLoaded) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    zoomAt(e.clientX, e.clientY, state.current.scale * factor);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    zoomAt(e.clientX, e.clientY, state.current.scale > 1.4 ? 1 : 2.5);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      dir="ltr"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Toolbar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 p-3 sm:justify-end sm:p-4">
        <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/60 p-1 shadow-xl backdrop-blur-md">
          <button
            onClick={() => zoomStep(-1)}
            disabled={scale <= MIN_SCALE}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/15 disabled:opacity-30"
            aria-label={t.lightbox.zoomOut}
            title={t.lightbox.zoomOut}
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="min-w-14 text-center text-xs font-black tabular-nums text-white" aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => zoomStep(1)}
            disabled={scale >= MAX_SCALE}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/15 disabled:opacity-30"
            aria-label={t.lightbox.zoomIn}
            title={t.lightbox.zoomIn}
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <span className="mx-0.5 h-6 w-px bg-white/20" />
          <button
            onClick={reset}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/15"
            aria-label={t.lightbox.reset}
            title={t.lightbox.reset}
          >
            <Maximize2 className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-destructive"
            aria-label={t.lightbox.close}
            title={t.lightbox.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Image stage */}
      <div
        ref={containerRef}
        className={
          "relative flex h-full w-full items-center justify-center overflow-hidden p-4 pb-24 pt-20 " +
          (scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")
        }
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        { }
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => setImgLoaded(true)}
          onDoubleClick={onDoubleClick}
          className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl transition-transform duration-100 ease-out"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            touchAction: "none",
          }}
        />
      </div>

      {/* Caption + hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-1 p-4">
        {caption ? <p className="max-w-2xl text-center text-sm font-bold text-white/90 drop-shadow">{caption}</p> : null}
        <p className="text-center text-[11px] font-semibold text-white/60">{t.lightbox.hint}</p>
      </div>
    </div>,
    document.body
  );
}
