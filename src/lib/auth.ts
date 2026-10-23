// Edge-safe session token helpers (Web Crypto only — no Node `crypto` module)
// so this file can be imported from both middleware (Edge runtime) and
// server actions / route handlers (Node runtime) without any divergence.
import type { Role } from "./types";

export const SESSION_COOKIE = "kc_session";
const STAFF_MAX_AGE = 60 * 60 * 14; // 14h — a shift
const ADMIN_MAX_AGE = 60 * 60 * 8; // 8h

function maxAgeForRole(role: Role) {
  return role === "admin" ? ADMIN_MAX_AGE : STAFF_MAX_AGE;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET environment variable.");
  }
  return secret;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of arr) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(getSecret());
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(payload: string): Promise<string> {
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(sig);
}

/** Creates a signed `role.expiry.signature` session token. */
export async function createSessionToken(role: Role): Promise<string> {
  const exp = Date.now() + maxAgeForRole(role) * 1000;
  const payload = `${role}.${exp}`;
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export function sessionCookieMaxAge(role: Role): number {
  return maxAgeForRole(role);
}

/** Verifies a session token and returns its role, or null if invalid/expired. */
export async function verifySessionToken(token: string | undefined): Promise<Role | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [role, expStr, signature] = parts;
  if (role !== "staff" && role !== "admin") return null;

  const payload = `${role}.${expStr}`;
  const expected = await sign(payload);
  if (!timingSafeEqual(expected, signature)) return null;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;

  return role;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Constant-time-ish comparison for PINs/passwords typed by a user. */
export function safeCompare(input: string, expected: string): boolean {
  if (!expected) return false;
  return timingSafeEqual(input, expected);
}

export function roleSatisfies(have: Role | null, need: Role): boolean {
  if (!have) return false;
  if (need === "staff") return have === "staff" || have === "admin";
  return have === "admin";
}

export function fromBase64UrlBytes(value: string): Uint8Array {
  return fromBase64Url(value);
}
