"use client";

import React, { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { FONT_STEPS, getFontScale, setFontScale } from "@/lib/font-scale";
import { cn } from "@/lib/utils";
import { Type, RotateCcw } from "lucide-react";

/* ============================================================
 * TextSizeControl (Task 21) — elegant A− / A+ control that scales
 * the text of the WHOLE platform (root font-size). Placed at the
 * bottom of the side menu. The choice persists across visits.
 * ============================================================ */

export default function TextSizeControl() {
  const { t } = useLang();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // read the persisted scale after mount (avoids hydration mismatch);
    // rAF keeps the setState out of the effect body (React lint rule)
    const v = getFontScale();
    if (v === 1) return;
    const id = requestAnimationFrame(() => setScale(v));
    return () => cancelAnimationFrame(id);
  }, []);

  const idx = Math.max(0, FONT_STEPS.indexOf(scale as (typeof FONT_STEPS)[number]));
  const canMinus = idx > 0;
  const canPlus = idx < FONT_STEPS.length - 1;

  const change = (dir: -1 | 1) => {
    const next = FONT_STEPS[Math.min(FONT_STEPS.length - 1, Math.max(0, idx + dir))];
    setScale(setFontScale(next));
  };

  const reset = () => setScale(setFontScale(1));

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-sm">
      <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <Type className="h-4 w-4 text-brand" />
        {t.common.textSize}
      </span>
      <div className="textsize-pill" role="group" aria-label={t.common.textSize}>
        <button
          type="button"
          onClick={() => change(-1)}
          disabled={!canMinus}
          className="textsize-btn text-xs"
          aria-label={t.common.textSmaller}
          title={t.common.textSmaller}
        >
          A−
        </button>
        <button
          type="button"
          onClick={reset}
          className={cn(
            "min-w-12 rounded-full px-1 text-center text-[11px] font-black tabular-nums",
            scale === 1 ? "text-brand" : "text-muted-foreground hover:text-brand"
          )}
          aria-label={t.common.textReset}
          title={t.common.textReset}
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          onClick={() => change(1)}
          disabled={!canPlus}
          className="textsize-btn text-sm"
          aria-label={t.common.textBigger}
          title={t.common.textBigger}
        >
          A+
        </button>
      </div>
      {scale !== 1 ? (
        <button
          type="button"
          onClick={reset}
          className="textsize-btn border border-border"
          aria-label={t.common.textReset}
          title={t.common.textReset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
