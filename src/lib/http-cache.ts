/* ============================================================
 * HTTP + memory cache helpers (Task 19 — Atlas connection guard)
 *
 * WHY: every visitor tab polls several public endpoints (activity
 * popup, stats counters, announcement bar, gallery …). On Vercel
 * each request lands on a lambda instance that holds its own
 * MongoDB pool, so polling traffic used to multiply Atlas
 * connections toward the M10 ceiling (1500).
 *
 * TWO LAYERS (both additive — response bodies are unchanged):
 * 1) EDGE (Vercel CDN): returning `Cache-Control: public,
 *    s-maxage=…, stale-while-revalidate=…` on a GET route makes
 *    the CDN serve repeated requests WITHOUT invoking the lambda
 *    at all → zero MongoDB connections for most polls.
 *    Only used on auth-free endpoints whose body is identical
 *    for every visitor. Per-user endpoints (notifications,
 *    dashboard, admin …) are NEVER cached here.
 * 2) MEMORY (per process): `memoJson` deduplicates the actual
 *    MongoDB work within a TTL window — protects Railway/Docker
 *    single-node deploys and warm lambdas that bypass the CDN.
 * Staleness is intentionally tiny (30–60s) and matches what the
 * UI already smooths over with its polling intervals.
 * ============================================================ */

const memStore = new Map<string, { at: number; value: unknown }>();

/** CDN cache headers for public, visitor-independent GET responses. */
export function edgeCacheHeaders(sMaxAge: number, swr: number): Record<string, string> {
  return {
    "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
  };
}

/** Cache an async payload in process memory for ttlMs. */
export async function memoJson<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = memStore.get(key);
  const now = Date.now();
  if (hit && now - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  memStore.set(key, { at: now, value });
  // hygiene: drop stale entries so the map stays tiny
  if (memStore.size > 32) {
    for (const [k, v] of memStore) {
      if (now - v.at > ttlMs) memStore.delete(k);
    }
  }
  return value;
}
