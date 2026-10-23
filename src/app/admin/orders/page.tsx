import { listOrdersWithItems } from "@/lib/data/orders";
import { daysAgoISO, formatMoney, todayISO } from "@/lib/date";
import OrdersClient from "./OrdersClient";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const to = sp.to || todayISO();
  const from = sp.from || daysAgoISO(6);

  const orders = await listOrdersWithItems({ from, to });
  const total = orders.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-xl tracking-wide">Orders</h1>
        <div className="text-right">
          <div className="text-xs text-kc-muted uppercase tracking-wide">Total</div>
          <div className="text-kc-gold-light font-display">{formatMoney(total)}</div>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3 mb-6" action="/admin/orders">
        <label className="block">
          <span className="block text-xs text-kc-muted mb-1">From</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="h-10 rounded-xl bg-kc-charcoal-2 border border-kc-gold/15 px-3 text-sm text-kc-cream focus:outline-none focus:border-kc-orange/50"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-kc-muted mb-1">To</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="h-10 rounded-xl bg-kc-charcoal-2 border border-kc-gold/15 px-3 text-sm text-kc-cream focus:outline-none focus:border-kc-orange/50"
          />
        </label>
        <button
          type="submit"
          className="h-10 px-5 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white text-sm font-semibold"
        >
          Filter
        </button>
      </form>

      <OrdersClient orders={orders} />
    </div>
  );
}
