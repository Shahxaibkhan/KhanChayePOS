import Link from "next/link";
import { getDashboardStats } from "@/lib/data/dashboard";
import { BUSINESS_DAY_START_HOUR, daysAgoISO, formatDate, formatMoney, todayISO } from "@/lib/date";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
] as const;

function rangeToFrom(range: string): string {
  const today = todayISO();
  if (range === "week") return daysAgoISO(6);
  if (range === "month") return daysAgoISO(29);
  if (range === "all") return "2020-01-01";
  return today;
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rawRange } = await searchParams;
  const range = RANGES.some((r) => r.key === rawRange) ? rawRange! : "today";
  const to = todayISO();
  const from = rangeToFrom(range);

  const stats = await getDashboardStats(from, to);

  return (
    <div className="px-5 sm:px-8 py-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-xl tracking-wide">Dashboard</h1>
          <p className="text-xs text-kc-muted mt-1">
            {range === "all" ? "All time" : from === to ? `Shift of ${formatDate(from)}` : `${formatDate(from)} – ${formatDate(to)}`}{" "}
            · each day runs {BUSINESS_DAY_START_HOUR} AM → {BUSINESS_DAY_START_HOUR} AM, so the noon–4 AM shift counts as one day
          </p>
        </div>
        <div className="flex gap-1 bg-kc-charcoal-2 rounded-full p-1">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin?range=${r.key}`}
              className={`px-4 py-2 rounded-full text-xs transition ${
                range === r.key ? "bg-kc-orange text-white" : "text-kc-muted hover:text-kc-cream"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Net — the one number that matters most, given room to breathe */}
      <div className="rounded-3xl bg-kc-charcoal-2 px-7 py-8 mb-5">
        <div className="text-xs text-kc-muted uppercase tracking-[0.15em] mb-2">Net (Sales − Expenses − Wastage)</div>
        <div className={`font-display text-4xl sm:text-5xl ${stats.net >= 0 ? "text-kc-green" : "text-kc-red"}`}>
          {formatMoney(stats.net)}
        </div>
        {(stats.voidedCount > 0 || stats.returnedCount > 0) && (
          <div className="text-xs text-kc-muted mt-3">
            {stats.voidedCount > 0 && <>{stats.voidedCount} voided</>}
            {stats.voidedCount > 0 && stats.returnedCount > 0 && " · "}
            {stats.returnedCount > 0 && <>{stats.returnedCount} returned</>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Sales (paid)" value={formatMoney(stats.salesTotal)} />
        <StatCard label="Orders" value={String(stats.orderCount)} />
        <StatCard label="Expenses" value={formatMoney(stats.expenseTotal)} />
        <StatCard label="Wastage" value={formatMoney(stats.wastageTotal)} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Chai cups" value={String(stats.chaiCups)} />
        <StatCard label="Parcel cups" value={String(stats.parcelCups)} />
        <StatCard label="Items sold" value={String(stats.itemsSold)} />
        <StatCard
          label={`Pending (${stats.pendingCount})`}
          value={formatMoney(stats.pendingTotal)}
          hint="Unpaid — not in sales yet"
        />
      </div>

      <div className="rounded-3xl bg-kc-charcoal-2 px-5 sm:px-7 py-7">
        <h2 className="font-display text-sm tracking-wide text-kc-muted mb-1">ITEMS SOLD</h2>
        <p className="text-xs text-kc-muted mb-6">Paid orders only · 🥡 = of which parcel</p>
        {stats.categories.length === 0 ? (
          <p className="text-kc-muted text-sm">No sales in this period yet.</p>
        ) : (
          <div className="space-y-7">
            {stats.categories.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-baseline justify-between gap-4 pb-2 mb-3 border-b border-kc-charcoal-3">
                  <span className="text-sm font-semibold text-kc-cream">{cat.category}</span>
                  <span className="text-xs text-kc-muted">
                    <span className="text-kc-cream font-semibold">{cat.quantity}</span> sold ·{" "}
                    <span className="text-kc-gold-light font-semibold">{formatMoney(cat.revenue)}</span>
                  </span>
                </div>
                <div className="space-y-2.5">
                  {cat.items.map((item) => (
                    <div key={item.name} className="flex items-center gap-3 text-sm">
                      <span className="flex-1 min-w-0 truncate text-kc-cream/90">{item.name}</span>
                      {item.parcelQty > 0 && <span className="text-xs text-kc-muted">🥡 {item.parcelQty}</span>}
                      <span className="w-12 text-right text-kc-cream font-medium">{item.quantity}</span>
                      <span className="w-20 text-right text-kc-gold-light">{formatMoney(item.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-kc-charcoal-2 p-5">
      <div className="text-xs text-kc-muted uppercase tracking-wide mb-2">{label}</div>
      <div className="font-display text-2xl text-kc-gold-light">{value}</div>
      {hint && <div className="text-[11px] text-kc-muted mt-1">{hint}</div>}
    </div>
  );
}
