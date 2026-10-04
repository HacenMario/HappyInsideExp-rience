"use client";

import React from "react";

/* ============================================================
 * Hourglass3D (Task 21) — elegant pure-CSS 3D hourglass used in
 * the "تبقّى n يومًا على انطلاق المخيم" countdown phrase.
 * No images, no external assets: glass bulbs + gold frame + live
 * falling sand are drawn entirely with CSS (clip-path, gradients,
 * keyframes). Respects prefers-reduced-motion via globals.css.
 * ============================================================ */

export default function Hourglass3D({
  size = 24,
  className = "",
  animated = true,
}: {
  size?: number; // rendered height in px (design height)
  className?: string;
  animated?: boolean;
}) {
  // Natural design is 40w × 56h; scale everything from the requested height
  const s = size / 56;
  return (
    <span
      className={"hg3d " + className}
      style={{
        width: `${40 * s}px`,
        height: `${56 * s}px`,
        fontSize: `${s}px`,
        // @ts-expect-error — CSS custom property for the sand-cycle duration
        "--hg-dur": animated ? "9s" : "0s",
      }}
      role="img"
      aria-label="⏳"
    >
      <span className="hg3d-inner">
        {/* gold frame: top & bottom caps */}
        <span className="hg3d-cap hg3d-cap-top" />
        <span className="hg3d-cap hg3d-cap-bottom" />
        {/* side pillars */}
        <span className="hg3d-pillar hg3d-pillar-l" />
        <span className="hg3d-pillar hg3d-pillar-r" />
        {/* glass bulbs */}
        <span className="hg3d-glass">
          <span className="hg3d-bulb hg3d-bulb-top">
            <span className="hg3d-sand-top" />
          </span>
          <span className="hg3d-bulb hg3d-bulb-bottom">
            <span className="hg3d-sand-bottom" />
          </span>
          {/* falling stream */}
          <span className="hg3d-stream" />
          {/* glass shine */}
          <span className="hg3d-shine" />
        </span>
        {/* soft ground shadow */}
        <span className="hg3d-shadow" />
      </span>
    </span>
  );
}
