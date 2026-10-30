import { listOrdersWithItems } from "@/lib/data/orders";
import { listItems } from "@/lib/data/items";
import { listClients } from "@/lib/data/clients";
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

  const [orders, items, clients] = await Promise.all([
    listOrdersWithItems({ from, to }),
    listItems(),
    listClients(),
  ]);
  const total = orders.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="px-5 sm:px-8 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-display text-xl tracking-wide">Orders</h1>
        <div className="text-right">
          <div className="text-xs text-kc-muted uppercase tracking-wide">Total</div>
          <div className="text-kc-gold-light font-display">{formatMoney(total)}</div>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3 mb-7" action="/admin/orders">
        <label className="block">
          <span className="block text-xs text-kc-muted mb-1.5">From</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="h-11 rounded-xl bg-kc-charcoal-2 px-3.5 text-sm text-kc-cream focus:outline-none focus:ring-2 focus:ring-kc-orange/50"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-kc-muted mb-1.5">To</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="h-11 rounded-xl bg-kc-charcoal-2 px-3.5 text-sm text-kc-cream focus:outline-none focus:ring-2 focus:ring-kc-orange/50"
          />
        </label>
        <button
          type="submit"
          className="h-11 px-6 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white text-sm font-semibold"
        >
          Filter
        </button>
      </form>

      <OrdersClient orders={orders} items={items} clients={clients} />
    </div>
  );
}
