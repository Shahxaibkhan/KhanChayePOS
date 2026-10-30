import Link from "next/link";
import { getDashboardStats } from "@/lib/data/dashboard";
import { daysAgoISO, formatMoney, todayISO } from "@/lib/date";

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
        <h1 className="font-display text-xl tracking-wide">Dashboard</h1>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Sales" value={formatMoney(stats.salesTotal)} />
        <StatCard label="Orders" value={String(stats.orderCount)} />
        <StatCard label="Expenses" value={formatMoney(stats.expenseTotal)} />
        <StatCard label="Wastage" value={formatMoney(stats.wastageTotal)} />
      </div>

      <div className="rounded-3xl bg-kc-charcoal-2 px-7 py-7">
        <h2 className="font-display text-sm tracking-wide text-kc-muted mb-5">TOP ITEMS</h2>
        {stats.topItems.length === 0 ? (
          <p className="text-kc-muted text-sm">No sales in this period yet.</p>
        ) : (
          <div className="space-y-4">
            {stats.topItems.map((item, i) => (
              <div key={item.name} className="flex items-center gap-4">
                <span className="text-kc-muted text-xs w-4">{i + 1}</span>
                <span className="flex-1 text-sm text-kc-cream">{item.name}</span>
                <span className="text-xs text-kc-muted">{item.quantity} sold</span>
                <span className="text-sm text-kc-gold-light font-medium w-20 text-right">
                  {formatMoney(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-kc-charcoal-2 p-5">
      <div className="text-xs text-kc-muted uppercase tracking-wide mb-2">{label}</div>
      <div className="font-display text-2xl text-kc-gold-light">{value}</div>
    </div>
  );
}
