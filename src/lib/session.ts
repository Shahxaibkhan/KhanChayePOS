import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieMaxAge,
  verifySessionToken,
} from "./auth";
import type { Role } from "./types";

export async function getRole(): Promise<Role | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function setSession(role: Role) {
  const token = await createSessionToken(role);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAge(role),
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Use at the top of a Server Component page/layout to gate access. */
export async function requireRole(need: Role, loginPath: string, currentPath: string) {
  const role = await getRole();
  const ok = role === "admin" || (need === "staff" && role === "staff");
  if (!ok) {
    redirect(`${loginPath}?next=${encodeURIComponent(currentPath)}`);
  }
  return role as Role;
}

export async function getStaffLabel(): Promise<string> {
  const role = await getRole();
  return role === "admin" ? "Admin" : "Staff";
}
