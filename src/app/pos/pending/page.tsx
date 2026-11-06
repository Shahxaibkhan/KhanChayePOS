import Link from "next/link";
import { listOrdersWithItems } from "@/lib/data/orders";
import { listItems } from "@/lib/data/items";
import { listClients } from "@/lib/data/clients";
import { daysAgoISO, formatDate, formatDateTime, formatMoney, todayISO } from "@/lib/date";
import OrdersClient from "../orders/OrdersClient";

const RANGES = [
  { key: "all", label: "All dates", daysBack: null },
  { key: "today", label: "Today", daysBack: 0 },
  { key: "yesterday", label: "Yesterday", daysBack: 1 },
  { key: "7d", label: "7 days", daysBack: 6 },
  { key: "30d", label: "30 days", daysBack: 29 },
] as const;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Every unpaid bill, with balances per client and date filters. */
export default async function PendingPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const today = todayISO();

  // Custom dates (from the date pickers) win over the preset chips.
  const custom = (sp.from && ISO.test(sp.from)) || (sp.to && ISO.test(sp.to));
  let from: string | null = null;
  let to: string | null = null;
  let rangeKey: string = "custom";
  if (custom) {
    from = sp.from && ISO.test(sp.from) ? sp.from : null;
    to = sp.to && ISO.test(sp.to) ? sp.to : today;
    if (from && from > to) [from, to] = [to, from];
  } else {
    const range = RANGES.find((r) => r.key === sp.range) ?? RANGES[0];
    rangeKey = range.key;
    if (range.daysBack !== null) {
      from = daysAgoISO(range.daysBack);
      to = range.key === "yesterday" ? from : today;
    }
  }

  const [orders, items, clients] = await Promise.all([
    listOrdersWithItems({ status: "pending", ...(from && { from }), ...(to && { to }) }),
    listItems(),
    listClients(),
  ]);

  const total = orders.reduce((s, o) => s + Number(o.total), 0);
  const oldest = orders.length ? orders[orders.length - 1].created_at : null;

  // Balance per client, biggest first; untagged bills grouped as walk-in.
  const byClient = new Map<string, { id: string | null; name: string; count: number; total: number }>();
  for (const o of orders) {
    const key = o.client_id ?? "";
    const row = byClient.get(key) ?? { id: o.client_id, name: o.client_name ?? "Walk-in (no client)", count: 0, total: 0 };
    row.count += 1;
    row.total += Number(o.total);
    byClient.set(key, row);
  }
  const balances = [...byClient.values()].sort((a, b) => b.total - a.total);

  const period =
    from === null && to === null
      ? "all dates"
      : from === null
        ? `up to ${formatDate(to!)}`
        : from === to
          ? formatDate(from)
          : `${formatDate(from)} – ${formatDate(to!)}`;

  const chip = (active: boolean) =>
    `shrink-0 px-4 py-2 rounded-full text-xs font-medium transition ${
      active ? "bg-kc-orange text-white" : "bg-kc-charcoal-2 text-kc-muted hover:text-kc-cream"
    }`;
  const dateInput =
    "h-9 rounded-xl bg-kc-charcoal-2 px-3 text-xs text-kc-cream focus:outline-none focus:ring-2 focus:ring-kc-orange/50 [color-scheme:dark]";

  const toolbar = (
    <div className="-mt-4 mb-7 space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        {RANGES.map((r) => (
          <Link key={r.key} href={`/pos/pending?range=${r.key}`} className={chip(r.key === rangeKey)}>
            {r.label}
          </Link>
        ))}
      </div>

      <form action="/pos/pending" className="flex flex-wrap items-center gap-2 text-xs text-kc-muted">
        <span>From</span>
        <input type="date" name="from" defaultValue={custom ? (from ?? "") : ""} max={today} className={dateInput} />
        <span>to</span>
        <input type="date" name="to" defaultValue={custom ? (to ?? "") : ""} max={today} className={dateInput} />
        <button className={chip(rangeKey === "custom")}>Show</button>
      </form>

      <div className="rounded-2xl bg-kc-charcoal-2 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs text-kc-muted uppercase tracking-wide">Outstanding · {period}</div>
            <div className="font-display text-2xl text-kc-orange mt-1">{formatMoney(total)}</div>
          </div>
          <div className="text-right text-xs text-kc-muted">
            {orders.length} unpaid {orders.length === 1 ? "bill" : "bills"}
            {oldest && (
              <>
                <br />
                Oldest: {formatDateTime(oldest)}
              </>
            )}
          </div>
        </div>

        {balances.length > 0 && (
          <div className="mt-4 divide-y divide-kc-charcoal-3 border-t border-kc-charcoal-3">
            {balances.map((b) => {
              const row = (
                <>
                  <span className="flex-1 truncate text-kc-cream">{b.name}</span>
                  <span className="text-kc-muted">
                    {b.count} {b.count === 1 ? "bill" : "bills"}
                  </span>
                  <span className="w-24 text-right font-semibold text-kc-orange">{formatMoney(b.total)}</span>
                </>
              );
              return b.id ? (
                <Link
                  key={b.id}
                  href={`/pos/clients/${b.id}?range=all&status=unpaid`}
                  className="flex items-center gap-4 py-2.5 text-sm hover:bg-kc-charcoal-3/40"
                >
                  {row}
                  <span className="text-kc-muted">›</span>
                </Link>
              ) : (
                <div key="walk-in" className="flex items-center gap-4 py-2.5 text-sm">
                  {row}
                  <span className="invisible">›</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <OrdersClient
      orders={orders}
      items={items}
      clients={clients}
      title="Pending Payments"
      toolbar={toolbar}
      emptyText={`No unpaid bills for ${period}. 🎉`}
      showPaidTotal={false}
    />
  );
}
