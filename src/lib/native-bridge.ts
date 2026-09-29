/* Bridge to the native Android app ("window.AndroidBridge" is injected by
 * the app's WebView). Every call is a safe no-op in any normal browser, so
 * these helpers can be used unconditionally from client components. */

export interface AndroidBridge {
  registerDevice?: (payload: string) => void;
  appVersion?: () => string;
}

export function nativeBridge(): AndroidBridge | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AndroidBridge?: AndroidBridge };
  return w.AndroidBridge ?? null;
}

/* Tell the native layer which identity should receive push notifications:
 *  - { type: "user",  phone, userId?, fullName? } after login/registration
 *  - { type: "guest" } after logout (broadcast notifications only)
 * The native side calls /api/mobile/register with this payload and then
 * polls /api/mobile/poll in the background (WorkManager). */
export function notifyNativeDevice(payload: Record<string, unknown>) {
  try {
    nativeBridge()?.registerDevice?.(JSON.stringify(payload));
  } catch {
    /* ignore — the bridge only exists inside the Android app */
  }
}
