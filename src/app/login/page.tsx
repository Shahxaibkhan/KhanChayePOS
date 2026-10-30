import Image from "next/image";
import Link from "next/link";
import { staffLoginAction } from "@/lib/actions/auth-actions";
import PinPad from "./PinPad";

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <Image src="/logo-icon.png" alt="Khan Chaye" width={88} height={88} className="mb-4 drop-shadow-[0_8px_30px_rgba(224,123,57,0.35)]" priority />
      <h1 className="font-display text-2xl tracking-wide text-kc-cream mb-1">KHAN CHAYE</h1>
      <p className="text-kc-muted text-sm mb-10 uppercase tracking-[0.2em]">Staff Login</p>

      {error ? (
        <p className="mb-5 text-sm text-kc-red bg-kc-red/10 rounded-lg px-4 py-2.5">
          Wrong PIN. Try again.
        </p>
      ) : null}

      <PinPad action={staffLoginAction} next={next || "/pos"} />

      <Link href="/admin/login" className="mt-10 text-xs text-kc-muted hover:text-kc-gold-light tracking-wide uppercase">
        Admin login →
      </Link>
    </main>
  );
}
