import { MongoClient, type Db, type Collection } from "mongodb";

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017";
}

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "happy_inside_experience";

interface MongoGlobal {
  __mongoClient?: MongoClient;
  __mongoPromise?: Promise<MongoClient>;
}

const globalForMongo = globalThis as unknown as MongoGlobal;

/* The client promise is cached on globalThis in EVERY environment:
 * - dev           → survives HMR module reloads (no connection leak)
 * - Vercel serverless → reused across invocations of the same warm lambda
 *   (without this, every cold lambda instance would open new Atlas sockets)
 * - Railway / Docker / local → one pooled client per process. */
if (!globalForMongo.__mongoPromise) {
  globalForMongo.__mongoClient = new MongoClient(uri, {
    maxPoolSize: 15,
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    maxIdleTimeMS: 30000,
    appName: "happy-inside-experience",
  });
  globalForMongo.__mongoPromise = globalForMongo.__mongoClient.connect().catch((e) => {
    // Don't cache the rejection forever: the next request retries the connection
    globalForMongo.__mongoClient = undefined;
    globalForMongo.__mongoPromise = undefined;
    throw e;
  });
}
const clientPromise: Promise<MongoClient> = globalForMongo.__mongoPromise;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

/* ---------- Typed collections ---------- */

export interface UserDoc {
  _id?: unknown;
  fullName: string;
  phone: string;
  password: string; // bcrypt hash
  gender: "male" | "female";
  accountType?: "student" | "specialist"; // pricing category (legacy users = specialist)
  wilaya?: string;
  workplace?: string;
  bio?: string;
  avatar?: string | null; // base64 data URL
  role: "admin" | "user";
  recoveryQuestion?: string;
  recoveryAnswer?: string;
  status: "active" | "banned";
  createdAt: Date;
}

export interface CampSettingsDoc {
  _id?: unknown;
  key: "main";
  edition: number;
  nameEn: string; // Happy inside expérience (never translated)
  sloganAr: string;
  sloganFr: string;
  descAr: string;
  descFr: string;
  locationAr: string;
  locationFr: string;
  startDate: string; // ISO
  endDate: string;
  totalSeats: number;
  registrationOpen: boolean;
  fee: number; // SPECIALIST participation fee (DZD) — 0 = free/unset
  studentFee?: number; // STUDENT participation fee (DZD) — undefined = same as fee
  logo?: string | null; // base64 data URL — camp logo (header/footer/splash)
  heroImage?: string | null; // data URL — landing hero visual (null = /images/hero.png)
  programImage1?: string | null; // data URL — camp poster (null = /images/program-poster.jpg)
  programImage2?: string | null; // data URL — detailed day-by-day program (null = /images/program-details.jpg)
  whatsappNumber: string;
  email: string;
  facebookUrl?: string;
  instagramUrl?: string;
  announcementBarActive: boolean;
  announcementBarFloating: boolean;
  announcementBarTextAr: string;
  announcementBarTextFr: string;
  announcementBarLink?: string;
}

export interface AnnouncementDoc {
  _id?: unknown;
  titleAr: string;
  titleFr: string;
  bodyAr: string;
  bodyFr: string;
  pinned: boolean;
  active: boolean;
  notify: boolean;
  createdAt: Date;
}

export interface SpeakerDoc {
  _id?: unknown;
  name: string; // Latin name e.g. "SAHARAOUI Lynda"
  nameAr: string; // Arabic name e.g. "ليندة صحراوي"
  titleAr: string;
  titleFr: string;
  bioAr: string;
  bioFr: string;
  activityAr: string;
  activityFr: string;
  photo?: string | null; // base64 data URL
  order: number;
  active: boolean;
}

export interface MediaDoc {
  _id?: unknown;
  title: string;
  titleFr?: string;
  type: "image" | "video";
  data: string; // base64 data URL
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface NotificationDoc {
  _id?: unknown;
  userId: string | null; // null = broadcast to everyone
  titleAr: string;
  titleFr: string;
  bodyAr: string;
  bodyFr: string;
  link?: string;
  readBy: string[];
  createdAt: Date;
}

export interface PushSubscriptionDoc {
  _id?: unknown;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: Date;
}

export interface ContactMessageDoc {
  _id?: unknown;
  name: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface SuggestionDoc {
  _id?: unknown;
  userId?: string | null;
  name: string;
  type: "suggestion" | "report";
  subject: string;
  message: string;
  status: "new" | "in_review" | "resolved";
  createdAt: Date;
}

export interface FaqDoc {
  _id?: unknown;
  questionAr: string;
  questionFr: string;
  answerAr: string;
  answerFr: string;
  order: number;
  active: boolean;
}

export interface CampRegistrationDoc {
  _id?: unknown;
  userId: string;
  userFullName: string;
  userPhone: string;
  accountType?: "student" | "specialist"; // pricing category snapshot at booking time
  amountDue?: number; // price the registrant must pay (DZD) — snapshot of the admin pricing
  motivationAr?: string;
  code?: string; // unique booking code shown on the digital card + QR (e.g. HIEX-4K7Q2B)
  attended?: boolean; // admin check-in at the camp gate
  attendedAt?: Date;
  checkedInBy?: string; // admin full name who scanned/validated the attendance
  certificate?: {
    issued: boolean;
    issuedAt: Date;
    number: string; // HIEX-CERT-2026-0001
    issuedBy?: string;
  } | null;
  status: "pending" | "confirmed" | "cancelled";
  amountPaid?: number; // set when admin validates the payment
  paymentNote?: string;
  paidAt?: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
}

/* Waiting list filled when all camp seats are taken. People are promoted
 * FIFO (oldest waiting first) as soon as the admin frees a seat. */
export interface WaitlistDoc {
  _id?: unknown;
  userId: string;
  fullName: string;
  phone: string;
  accountType: "student" | "specialist";
  wilaya?: string;
  status: "waiting" | "promoted" | "left";
  promotedRegistrationId?: string;
  promotedAt?: Date;
  createdAt: Date;
}

export interface VapidDoc {
  _id?: unknown;
  key: "vapid";
  publicKey: string;
  privateKey: string;
}

/* Mobile devices registered by the Android app for background notifications.
 * phone is either the account phone or "guest:<id>" for anonymous devices
 * (guests receive broadcast notifications only). deviceToken is the device's
 * secret used to authenticate /api/mobile/poll. */
export interface MobileDeviceDoc {
  _id?: unknown;
  phone: string;
  userId: string | null;
  fullName?: string;
  deviceToken: string;
  platform: string; // "android"
  appVersion?: string;
  fcmToken?: string | null;
  createdAt: Date;
  lastActiveAt: Date;
}

export async function collections() {
  const db = await getDb();
  return {
    users: db.collection<UserDoc>("users"),
    settings: db.collection<CampSettingsDoc>("camp_settings"),
    announcements: db.collection<AnnouncementDoc>("announcements"),
    speakers: db.collection<SpeakerDoc>("speakers"),
    media: db.collection<MediaDoc>("media"),
    notifications: db.collection<NotificationDoc>("notifications"),
    pushSubs: db.collection<PushSubscriptionDoc>("push_subscriptions"),
    contactMessages: db.collection<ContactMessageDoc>("contact_messages"),
    suggestions: db.collection<SuggestionDoc>("suggestions"),
    faqs: db.collection<FaqDoc>("faqs"),
    registrations: db.collection<CampRegistrationDoc>("camp_registrations"),
    waitlist: db.collection<WaitlistDoc>("camp_waitlist"),
    mobileDevices: db.collection<MobileDeviceDoc>("mobile_devices"),
    vapid: db.collection<VapidDoc>("vapid_keys"),
    seedMeta: db.collection<{ _id: string; version: number; seededAt: Date }>("seed_meta"),
  };
}

export const ObjectIdToString = (v: unknown): string =>
  v && typeof v === "object" && "toString" in v ? (v as { toString(): string }).toString() : String(v);

export default clientPromise;
