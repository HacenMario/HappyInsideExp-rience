import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { collections, type UserDoc } from "./mongodb";

const SECRET = process.env.AUTH_SECRET || "happy-inside-experience-super-secret-2026";
const COOKIE_NAME = "hiex_session";

export interface SessionPayload {
  uid: string;
  phone: string;
  role: "admin" | "user";
  fullName: string;
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure automatically on HTTPS (Vercel / Railway / any production host).
    // Override with COOKIE_SECURE=true|false if you self-host over plain HTTP.
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getCurrentUser(): Promise<UserDoc | null> {
  const session = await getSession();
  if (!session) return null;
  const c = await collections();
  try {
    const user = await c.users.findOne({ _id: new ObjectId(session.uid) });
    return user;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<UserDoc | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export function publicUser(u: UserDoc) {
  return {
    id: u._id ? u._id.toString() : "",
    fullName: u.fullName,
    phone: u.phone,
    gender: u.gender,
    accountType: (u.accountType === "student" ? "student" : "specialist") as "student" | "specialist",
    wilaya: u.wilaya || "",
    workplace: u.workplace || "",
    bio: u.bio || "",
    avatar: u.avatar || null,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
  };
}

export type PublicUser = ReturnType<typeof publicUser>;
