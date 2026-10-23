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
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-xl tracking-wide">Dashboard</h1>
        <div className="flex gap-1 bg-kc-charcoal-2 rounded-full p-1">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin?range=${r.key}`}
              className={`px-3 py-1.5 rounded-full text-xs transition ${
                range === r.key ? "bg-kc-orange text-white" : "text-kc-muted hover:text-kc-cream"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Sales" value={formatMoney(stats.salesTotal)} accent="orange" />
        <StatCard label="Orders" value={String(stats.orderCount)} accent="gold" />
        <StatCard label="Expenses" value={formatMoney(stats.expenseTotal)} accent="red" />
        <StatCard
          label="Net"
          value={formatMoney(stats.net)}
          accent={stats.net >= 0 ? "green" : "red"}
        />
      </div>

      <div className="rounded-2xl border border-kc-gold/10 bg-kc-charcoal-2 p-5">
        <h2 className="font-display text-sm tracking-wide mb-4">TOP ITEMS</h2>
        {stats.topItems.length === 0 ? (
          <p className="text-kc-muted text-sm">No sales in this period yet.</p>
        ) : (
          <div className="space-y-3">
            {stats.topItems.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
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

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "orange" | "gold" | "red" | "green";
}) {
  const colors: Record<string, string> = {
    orange: "text-kc-orange",
    gold: "text-kc-gold-light",
    red: "text-kc-red",
    green: "text-kc-green",
  };
  return (
    <div className="rounded-2xl border border-kc-gold/10 bg-kc-charcoal-2 p-4">
      <div className="text-xs text-kc-muted uppercase tracking-wide mb-1">{label}</div>
      <div className={`font-display text-xl ${colors[accent]}`}>{value}</div>
    </div>
  );
}
