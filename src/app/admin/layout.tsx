import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth-actions";

// Everything under /admin is live, per-request data behind an auth gate —
// never statically prerender it.
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/items", label: "Items" },
  { href: "/admin/expenses", label: "Expenses" },
  { href: "/admin/wastage", label: "Wastage" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/clients", label: "Clients" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex min-h-full flex-col md:flex-row">
      <aside className="md:w-60 shrink-0 bg-kc-charcoal flex md:flex-col">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <Image src="/logo-icon.png" alt="Khan Chaye" width={30} height={30} />
          <div className="leading-tight">
            <div className="font-display text-xs tracking-wide">KHAN CHAYE</div>
            <div className="text-[10px] text-kc-muted uppercase tracking-[0.15em]">Admin</div>
          </div>
        </div>

        <nav className="flex md:flex-col gap-1 px-4 py-2 overflow-x-auto md:overflow-visible flex-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2.5 rounded-xl text-sm text-kc-cream/90 hover:bg-kc-charcoal-2 whitespace-nowrap transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 flex md:flex-col gap-1">
          <Link
            href="/pos"
            className="px-4 py-2.5 rounded-xl text-sm text-kc-gold-light hover:bg-kc-charcoal-2 transition whitespace-nowrap"
          >
            Open POS →
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-kc-muted hover:text-kc-red hover:bg-kc-charcoal-2 transition whitespace-nowrap"
            >
              Logout
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
