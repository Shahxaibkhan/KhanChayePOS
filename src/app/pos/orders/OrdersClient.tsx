"use client";

import { useState } from "react";
import type { Item, OrderWithItems } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/date";
import OrderEditor from "@/components/OrderEditor";
import { cancelOrderAction, editOrderAction } from "./actions";

export default function OrdersClient({ orders, items }: { orders: OrderWithItems[]; items: Item[] }) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderWithItems | null>(null);

  const total = orders.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="flex-1 px-5 sm:px-8 py-8 max-w-3xl w-full mx-auto">
      <div className="flex items-center justify-between mb-7">
        <h1 className="font-display text-xl tracking-wide">Today&apos;s Orders</h1>
        <div className="text-right">
          <div className="text-xs text-kc-muted uppercase tracking-wide">Total</div>
          <div className="text-kc-gold-light font-display">{formatMoney(total)}</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-kc-muted text-sm text-center mt-16">No orders yet today.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`rounded-2xl p-5 ${
                order.status === "voided"
                  ? "bg-kc-red/5 opacity-60"
                  : order.status === "returned"
                    ? "bg-kc-gold/5 opacity-70"
                    : "bg-kc-charcoal-2"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">
                  Order #{order.order_number}
                  {order.status === "voided" && <span className="ml-2 text-xs text-kc-red uppercase">Voided</span>}
                  {order.status === "returned" && (
                    <span className="ml-2 text-xs text-kc-gold-light uppercase">Returned</span>
                  )}
                </div>
                <div className="text-sm text-kc-gold-light font-semibold">{formatMoney(Number(order.total))}</div>
              </div>
              <div className="text-xs text-kc-muted mb-3">
                {formatDateTime(order.created_at)} · {order.payment_method} · {order.created_by ?? "—"}
                {order.edited_at && <> · edited by {order.edited_by}</>}
              </div>
              <div className="text-xs text-kc-cream/80 space-y-1">
                {order.order_items.map((li) => (
                  <div key={li.id} className="flex justify-between">
                    <span>
                      {li.quantity} × {li.item_name}
                      {li.parcel_qty > 0 && <span className="text-kc-muted"> · 🥡 {li.parcel_qty} parcel</span>}
                    </span>
                    <span>{formatMoney(Number(li.line_total))}</span>
                  </div>
                ))}
              </div>
              {order.note && <div className="text-xs text-kc-muted mt-3 italic">“{order.note}”</div>}

              {order.status === "completed" && (
                <div className="flex items-center gap-5 mt-4 pt-4">
                  <button
                    onClick={() => setEditingOrder(order)}
                    className="text-xs text-kc-gold-light hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    disabled={cancellingId === order.id}
                    onClick={async () => {
                      if (!confirm(`Cancel order #${order.order_number}?`)) return;
                      setCancellingId(order.id);
                      await cancelOrderAction(order.id);
                      setCancellingId(null);
                    }}
                    className="text-xs text-kc-red hover:underline disabled:opacity-40"
                  >
                    {cancellingId === order.id ? "Cancelling…" : "Cancel order"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editingOrder && (
        <OrderEditor
          order={editingOrder}
          items={items}
          onClose={() => setEditingOrder(null)}
          onSave={editOrderAction}
        />
      )}
    </div>
  );
}
