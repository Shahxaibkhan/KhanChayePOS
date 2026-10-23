import Image from "next/image";
import Link from "next/link";
import { adminLoginAction } from "@/lib/actions/auth-actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <Image src="/logo-icon.png" alt="Khan Chaye" width={88} height={88} className="mb-4 drop-shadow-[0_8px_30px_rgba(224,123,57,0.35)]" priority />
      <h1 className="font-display text-2xl tracking-wide text-kc-cream mb-1">KHAN CHAYE</h1>
      <p className="text-kc-muted text-sm mb-10 uppercase tracking-[0.2em]">Admin Login</p>

      {error ? (
        <p className="mb-5 text-sm text-kc-red bg-kc-red/10 border border-kc-red/30 rounded-lg px-4 py-2">
          Wrong password. Try again.
        </p>
      ) : null}

      <form action={adminLoginAction} className="w-full max-w-xs flex flex-col gap-4">
        <input type="hidden" name="next" value={next || "/admin"} />
        <input
          type="password"
          name="password"
          autoFocus
          placeholder="Admin password"
          className="h-14 rounded-2xl bg-kc-charcoal-2 border border-kc-gold/15 px-5 text-kc-cream placeholder:text-kc-muted focus:outline-none focus:border-kc-orange/60 text-center tracking-wide"
        />
        <button
          type="submit"
          className="h-14 rounded-2xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white font-semibold hover:shadow-[0_10px_30px_rgba(224,123,57,0.35)] active:scale-95 transition"
        >
          Unlock
        </button>
      </form>

      <Link href="/login" className="mt-10 text-xs text-kc-muted hover:text-kc-gold-light tracking-wide uppercase">
        ← Staff login
      </Link>
    </main>
  );
}
