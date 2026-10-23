"use server";

import { redirect } from "next/navigation";
import { safeCompare } from "@/lib/auth";
import { clearSession, setSession } from "@/lib/session";

function safeNext(next: FormDataEntryValue | null, fallback: string): string {
  const value = typeof next === "string" ? next : "";
  // only ever allow redirecting back into our own app
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}

export async function staffLoginAction(formData: FormData) {
  const pin = String(formData.get("pin") ?? "");
  const next = safeNext(formData.get("next"), "/pos");
  const expected = process.env.STAFF_PIN ?? "";

  if (!safeCompare(pin, expected)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  await setSession("staff");
  redirect(next);
}

export async function adminLoginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"), "/admin");
  const expected = process.env.ADMIN_PASSWORD ?? "";

  if (!safeCompare(password, expected)) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }

  await setSession("admin");
  redirect(next);
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
