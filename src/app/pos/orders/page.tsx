import { listOrdersWithItems } from "@/lib/data/orders";
import { formatDateTime, formatMoney, todayISO } from "@/lib/date";

export default async function TodaysOrdersPage() {
  const today = todayISO();
  const orders = await listOrdersWithItems({ from: today, to: today });
  const total = orders.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="flex-1 px-4 sm:px-6 py-6 max-w-3xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl tracking-wide">Today&apos;s Orders</h1>
        <div className="text-right">
          <div className="text-xs text-kc-muted uppercase tracking-wide">Total</div>
          <div className="text-kc-gold-light font-display">{formatMoney(total)}</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-kc-muted text-sm text-center mt-16">No orders yet today.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`rounded-2xl border p-4 ${
                order.status === "voided"
                  ? "border-kc-red/20 bg-kc-red/5 opacity-60"
                  : "border-kc-gold/10 bg-kc-charcoal-2"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">
                  Order #{order.order_number}
                  {order.status === "voided" && (
                    <span className="ml-2 text-xs text-kc-red uppercase">Voided</span>
                  )}
                </div>
                <div className="text-sm text-kc-gold-light font-semibold">{formatMoney(Number(order.total))}</div>
              </div>
              <div className="text-xs text-kc-muted mb-2">
                {formatDateTime(order.created_at)} · {order.payment_method} · {order.created_by ?? "—"}
              </div>
              <div className="text-xs text-kc-cream/80 space-y-0.5">
                {order.order_items.map((li) => (
                  <div key={li.id} className="flex justify-between">
                    <span>
                      {li.quantity} × {li.item_name}
                    </span>
                    <span>{formatMoney(Number(li.line_total))}</span>
                  </div>
                ))}
              </div>
              {order.note && <div className="text-xs text-kc-muted mt-2 italic">“{order.note}”</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
