import webpush from "web-push";
import { collections } from "./mongodb";

let configured = false;

async function ensureVapid() {
  const c = await collections();
  const envPub = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (envPub && envPriv) {
    // Keys supplied via .env take precedence and are synced into the DB
    // so that the public-key endpoint always matches what is actually used.
    await c.vapid.updateOne(
      { key: "vapid" },
      { $set: { key: "vapid", publicKey: envPub, privateKey: envPriv } },
      { upsert: true }
    );
  } else {
    const existing = await c.vapid.findOne({ key: "vapid" });
    if (!existing) {
      const keys = webpush.generateVAPIDKeys();
      await c.vapid.insertOne({ key: "vapid", publicKey: keys.publicKey, privateKey: keys.privateKey });
    }
  }
  const row = await c.vapid.findOne({ key: "vapid" });
  const subject = process.env.VAPID_SUBJECT || "mailto:contact@happyinside-experience.dz";
  webpush.setVapidDetails(subject, row!.publicKey, row!.privateKey);
  configured = true;
  return row!.publicKey;
}

export async function getVapidPublicKey(): Promise<string> {
  if (!configured) return ensureVapid();
  const c = await collections();
  const row = await c.vapid.findOne({ key: "vapid" });
  return row!.publicKey;
}

export interface PushPayload {
  titleAr: string;
  titleFr: string;
  bodyAr: string;
  bodyFr: string;
  link?: string;
}

export async function sendPushToAll(payload: PushPayload) {
  try {
    if (!configured) await ensureVapid();
    const c = await collections();
    const subs = await c.pushSubs.find().toArray();
    const json = JSON.stringify(payload);
    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys } as webpush.RequestOptions, json)
      )
    );
    // Clean up dead subscriptions
    const dead = results
      .map((r, i) => (r.status === "rejected" ? subs[i] : null))
      .filter((s): s is NonNullable<typeof s> => {
        if (!s) return false;
        const r = results.find((rr) => rr.status === "rejected");
        const reason = (r as PromiseRejectedResult | undefined)?.reason;
        return !!(reason && (reason.statusCode === 404 || reason.statusCode === 410));
      });
    if (dead.length) {
      await c.pushSubs.deleteMany({ endpoint: { $in: dead.map((d) => d.endpoint) } });
    }
    return { sent: subs.length };
  } catch (e) {
    console.error("push error", e);
    return { sent: 0 };
  }
}
