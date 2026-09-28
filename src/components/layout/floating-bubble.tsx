"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLang } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export const BUBBLE_SIZE = 56;
const EDGE_MARGIN = 18;
const CLOSE_ZONE_RADIUS = 74;

/* Re-show event: footer dispatches `hiex-show-bubble` with detail = storageKey */
export function showBubble(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {}
  window.dispatchEvent(new CustomEvent("hiex-show-bubble", { detail: storageKey }));
}

interface Pos {
  x: number;
  y: number;
}

interface FloatingBubbleProps {
  /** localStorage key persisted while the bubble is hidden */
  storageKey: string;
  /** initial corner (logical, respects RTL) */
  side: "start" | "end";
  ariaLabel: string;
  /** visual classes of the round button */
  className?: string;
  /** color of the expanding pulse ring */
  ringColor?: string;
  tooltip?: string;
  onClick: () => void;
  children: React.ReactNode;
}

/**
 * Messenger-style floating bubble:
 * - draggable anywhere on screen (mouse + touch via pointer events)
 * - while dragging, a close zone appears at the bottom center;
 *   dropping the bubble on it hides the bubble completely
 * - the bubble can be re-shown from the footer (showBubble())
 */
export default function FloatingBubble({
  storageKey,
  side,
  ariaLabel,
  className,
  ringColor,
  tooltip,
  onClick,
  children,
}: FloatingBubbleProps) {
  const { t } = useLang();
  const { toast } = useToast();
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const [pos, setPos] = useState<Pos | null>(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rtl = document.documentElement.dir === "rtl";
    // logical "start" maps to the physical right edge in RTL, left in LTR
    const physicalRight = (side === "start") === rtl;
    return {
      x: physicalRight ? vw - EDGE_MARGIN - BUBBLE_SIZE : EDGE_MARGIN,
      y: vh - EDGE_MARGIN - BUBBLE_SIZE - 58,
    };
  });
  const [dragging, setDragging] = useState(false);
  const [overZone, setOverZone] = useState(false);
  const [pressed, setPressed] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  /* ---- re-show from footer ---- */
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === storageKey) setHidden(false);
    };
    window.addEventListener("hiex-show-bubble", handler);
    return () => window.removeEventListener("hiex-show-bubble", handler);
  }, [storageKey]);

  /* ---- broadcast hidden state (footer listens to show/hide restore buttons) ---- */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("hiex-bubble-state", { detail: { key: storageKey, hidden } })
    );
  }, [hidden, storageKey]);

  /* ---- keep inside viewport on resize ---- */
  useEffect(() => {
    if (!pos) return;
    const onResize = () => {
      setPos((p) =>
        p
          ? {
              x: Math.min(Math.max(p.x, EDGE_MARGIN), window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN),
              y: Math.min(Math.max(p.y, 70), window.innerHeight - BUBBLE_SIZE - EDGE_MARGIN),
            }
          : p
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos]);

  const hideBubble = useCallback(() => {
    setHidden(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {}
    toast({ description: t.bubble.hiddenToast });
  }, [storageKey, toast, t]);

  const closeZoneCenter = useCallback((): Pos => {
    const el = zoneRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight - 92 };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos || hidden) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    };
    setPressed(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 7) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
    }
    const nx = Math.min(Math.max(d.origX + dx, EDGE_MARGIN), window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN);
    const ny = Math.min(Math.max(d.origY + dy, 70), window.innerHeight - BUBBLE_SIZE - EDGE_MARGIN);
    setPos({ x: nx, y: ny });
    const cx = nx + BUBBLE_SIZE / 2;
    const cy = ny + BUBBLE_SIZE / 2;
    const zc = closeZoneCenter();
    setOverZone(Math.hypot(cx - zc.x, cy - zc.y) < CLOSE_ZONE_RADIUS);
  };

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    setPressed(false);
    if (d.moved && overZone) {
      setDragging(false);
      setOverZone(false);
      hideBubble();
      return;
    }
    if (d.moved) {
      // snap to nearest horizontal edge (Messenger behaviour)
      const cx = pos ? pos.x + BUBBLE_SIZE / 2 : 0;
      const snapStart = cx < window.innerWidth / 2;
      const rtl = document.documentElement.dir === "rtl";
      const physicalStart = snapStart !== rtl; // logical "start" = leading edge
      setPos((p) =>
        p ? { x: physicalStart ? EDGE_MARGIN : window.innerWidth - BUBBLE_SIZE - EDGE_MARGIN, y: p.y } : p
      );
    } else {
      onClick();
    }
    setDragging(false);
    setOverZone(false);
  };

  if (hidden || !pos) return null;

  return (
    <>
      {/* Bottom close zone (visible only while dragging) */}
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-8 z-[76] flex flex-col items-center gap-1.5 transition-opacity duration-200",
          dragging ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      >
        <div
          ref={zoneRef}
          className={cn(
            "close-zone flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border bg-card/90 text-muted-foreground shadow-xl backdrop-blur",
            overZone && "close-zone-active"
          )}
        >
          <X className="h-7 w-7" />
        </div>
        <span
          className={cn(
            "rounded-full bg-card/95 px-3 py-1 text-[11px] font-bold shadow-md transition-colors",
            overZone && "bg-destructive text-white"
          )}
        >
          {t.bubble.closeHint}
        </span>
      </div>

      {/* The bubble */}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-grabbed={dragging}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          width: BUBBLE_SIZE,
          height: BUBBLE_SIZE,
        }}
        className={cn(
          "group fixed top-0 left-0 z-[72] flex items-center justify-center rounded-full text-white shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          dragging ? "bubble-dragging scale-110 shadow-2xl" : "bubble-idle hover:shadow-2xl",
          pressed && !dragging && "scale-95",
          className
        )}
      >
        {!dragging ? (
          <span
            className="pulse-ring absolute inset-0 rounded-full"
            style={{ ["--pulse-color" as string]: ringColor }}
          />
        ) : null}
        {children}
        {tooltip ? (
          <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-card px-3 py-1.5 text-xs font-bold text-foreground opacity-0 shadow-lg ring-1 ring-border transition-all duration-300 group-hover:opacity-100">
            {tooltip}
          </span>
        ) : null}
      </button>
    </>
  );
}
