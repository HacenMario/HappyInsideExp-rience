/* Task 21 — global text size control.
 * Tailwind sizes everything in rem, so scaling the ROOT font-size
 * scales the whole platform (both languages, RTL + LTR). The scale
 * is persisted in localStorage and applied by an inline <head>
 * script (root layout) before hydration — no flash, no layout jump. */

export const FONT_SCALE_KEY = "hiex_font_scale";
export const FONT_STEPS = [0.9, 1, 1.1, 1.2] as const;
const BASE_PX = 16;

export function normalizeScale(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return 1;
  // snap to the closest known step
  let best: number = FONT_STEPS[1];
  let bestDist = Infinity;
  for (const s of FONT_STEPS) {
    const d = Math.abs(s - n);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

export function getFontScale(): number {
  if (typeof window === "undefined") return 1;
  try {
    return normalizeScale(window.localStorage.getItem(FONT_SCALE_KEY));
  } catch {
    return 1;
  }
}

export function applyFontScale(v: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = `${BASE_PX * v}px`;
}

export function setFontScale(v: number) {
  const n = normalizeScale(v);
  try {
    if (n === 1) window.localStorage.removeItem(FONT_SCALE_KEY);
    else window.localStorage.setItem(FONT_SCALE_KEY, String(n));
  } catch {}
  applyFontScale(n);
  return n;
}

/* Inline <head> script (runs before React hydrates to avoid a flash) */
export const FONT_SCALE_BOOTSTRAP = `try{(function(){var v=parseFloat(localStorage.getItem("${FONT_SCALE_KEY}"));if(v&&v>=0.9&&v<=1.2&&v!==1){document.documentElement.style.fontSize=${BASE_PX}*v+"px"}})()}catch(e){}`;
