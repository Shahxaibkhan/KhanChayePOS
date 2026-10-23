import Image from "next/image";
import Link from "next/link";
import { getRole } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth-actions";

// Everything under /pos is live, per-request data behind an auth gate —
// never statically prerender it.
export const dynamic = "force-dynamic";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const role = await getRole();

  return (
    <div className="flex-1 flex flex-col min-h-full">
      <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-kc-gold/10 bg-kc-charcoal/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Image src="/logo-icon.png" alt="Khan Chaye" width={34} height={34} />
          <div className="leading-tight">
            <div className="font-display text-sm tracking-wide">KHAN CHAYE</div>
            <div className="text-[10px] text-kc-muted uppercase tracking-[0.15em]">Point of Sale</div>
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/pos"
            className="px-3 py-2 rounded-lg text-sm text-kc-cream/90 hover:bg-kc-charcoal-2 transition"
          >
            New Order
          </Link>
          <Link
            href="/pos/orders"
            className="px-3 py-2 rounded-lg text-sm text-kc-cream/90 hover:bg-kc-charcoal-2 transition"
          >
            Today&apos;s Orders
          </Link>
          {role === "admin" ? (
            <Link
              href="/admin"
              className="px-3 py-2 rounded-lg text-sm text-kc-gold-light hover:bg-kc-charcoal-2 transition"
            >
              Admin →
            </Link>
          ) : null}
          <form action={logoutAction}>
            <button
              type="submit"
              className="px-3 py-2 rounded-lg text-sm text-kc-muted hover:text-kc-red hover:bg-kc-charcoal-2 transition"
            >
              Logout
            </button>
          </form>
        </nav>
      </header>

      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
