import Image from "next/image";
import Link from "next/link";
import { getRole } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth-actions";
import { listLowStock } from "@/lib/data/inventory";
import { formatQty } from "@/lib/qty";
import { pendingSummary } from "@/lib/data/orders";
import { formatMoney } from "@/lib/date";

// Everything under /pos is live, per-request data behind an auth gate —
// never statically prerender it.
export const dynamic = "force-dynamic";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const [role, lowStock, pending] = await Promise.all([getRole(), listLowStock(), pendingSummary()]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="shrink-0 flex items-center justify-between gap-4 px-5 sm:px-8 py-4 bg-kc-charcoal/90 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Image src="/logo-icon.png" alt="Khan Chaye" width={32} height={32} />
          <div className="leading-tight">
            <div className="font-display text-sm tracking-wide">KHAN CHAYE</div>
            <div className="text-[10px] text-kc-muted uppercase tracking-[0.15em]">Point of Sale</div>
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-1.5">
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
          <Link
            href="/pos/pending"
            title={pending.count ? `${formatMoney(pending.total)} unpaid` : "No unpaid bills"}
            className="px-3 py-2 rounded-lg text-sm text-kc-cream/90 hover:bg-kc-charcoal-2 transition"
          >
            Pending
            {pending.count > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-kc-orange text-white text-[11px] font-bold">
                {pending.count}
              </span>
            )}
          </Link>
          <Link
            href="/pos/stock"
            className="px-3 py-2 rounded-lg text-sm text-kc-cream/90 hover:bg-kc-charcoal-2 transition"
          >
            Stock
            {lowStock.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-kc-red text-white text-[11px] font-bold">
                {lowStock.length}
              </span>
            )}
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

      {lowStock.length > 0 && (
        <Link
          href="/pos/stock"
          className="shrink-0 flex items-center gap-2 px-5 sm:px-8 py-2 bg-kc-red/15 text-kc-red text-xs hover:bg-kc-red/20 transition overflow-hidden"
        >
          <span className="font-semibold shrink-0">⚠ Refill soon:</span>
          <span className="truncate">
            {lowStock.map((g) => `${g.name} (${formatQty(g.stock, g.unit)} left)`).join(" · ")}
          </span>
          <span className="ml-auto shrink-0 font-semibold">Stock ›</span>
        </Link>
      )}

      <div className="flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
}
