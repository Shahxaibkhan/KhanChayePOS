"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { Client, Item, OrderWithItems } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/date";
import OrderEditor from "@/components/OrderEditor";
import PrintReceiptButtons from "@/components/PrintReceiptButtons";
import MarkPaidButtons from "@/components/MarkPaidButtons";
import { receiptFromOrder } from "@/lib/receipt";
import { cancelOrderAction, editOrderAction } from "./actions";

export default function OrdersClient({
  orders,
  items,
  clients,
  title = "Today's Orders",
  toolbar,
  emptyText = "No orders yet today.",
  linkClients = true,
}: {
  orders: OrderWithItems[];
  items: Item[];
  clients: Client[];
  title?: string;
  toolbar?: ReactNode; // rendered under the header (e.g. filters on a client's page)
  emptyText?: string;
  linkClients?: boolean; // client tags link to that client's order history
}) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderWithItems | null>(null);

  const total = orders.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.total), 0);
  const pending = orders.filter((o) => o.status === "pending");
  const pendingTotal = pending.reduce((s, o) => s + Number(o.total), 0);
  // Unpaid bills first so the cashier sees what's still with the waiters.
  const sorted = [...pending, ...orders.filter((o) => o.status !== "pending")];

  return (
    <div className="flex-1 px-5 sm:px-8 py-8 max-w-3xl w-full mx-auto">
      <div className="flex items-center justify-between gap-4 mb-7">
        <h1 className="font-display text-xl tracking-wide">{title}</h1>
        <div className="flex gap-6 text-right">
          {pending.length > 0 && (
            <div>
              <div className="text-xs text-kc-muted uppercase tracking-wide">Pending ({pending.length})</div>
              <div className="text-kc-orange font-display">{formatMoney(pendingTotal)}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-kc-muted uppercase tracking-wide">Paid sales</div>
            <div className="text-kc-gold-light font-display">{formatMoney(total)}</div>
          </div>
        </div>
      </div>

      {toolbar}

      {orders.length === 0 ? (
        <p className="text-kc-muted text-sm text-center mt-16">{emptyText}</p>
      ) : (
        <div className="space-y-4">
          {sorted.map((order) => (
            <div
              key={order.id}
              className={`rounded-2xl p-5 ${
                order.status === "voided"
                  ? "bg-kc-red/5 opacity-60"
                  : order.status === "returned"
                    ? "bg-kc-gold/5 opacity-70"
                    : order.status === "pending"
                      ? "bg-kc-charcoal-2 ring-2 ring-kc-orange/60"
                      : "bg-kc-charcoal-2"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">
                  Order #{order.order_number}
                  {order.client_name &&
                    (linkClients && order.client_id ? (
                      <Link
                        href={`/pos/clients/${order.client_id}`}
                        title={`All orders for ${order.client_name}`}
                        className="ml-2 text-xs text-kc-gold-light bg-kc-gold/10 hover:bg-kc-gold/25 rounded-full px-2.5 py-0.5 transition"
                      >
                        {order.client_name} ›
                      </Link>
                    ) : (
                      <span className="ml-2 text-xs text-kc-gold-light bg-kc-gold/10 rounded-full px-2.5 py-0.5">
                        {order.client_name}
                      </span>
                    ))}
                  {order.status === "pending" && (
                    <span className="ml-2 text-xs text-kc-orange uppercase font-semibold">⏳ Payment pending</span>
                  )}
                  {order.status === "voided" && <span className="ml-2 text-xs text-kc-red uppercase">Voided</span>}
                  {order.status === "returned" && (
                    <span className="ml-2 text-xs text-kc-gold-light uppercase">Returned</span>
                  )}
                </div>
                <div className="text-sm text-kc-gold-light font-semibold">{formatMoney(Number(order.total))}</div>
              </div>
              <div className="text-xs text-kc-muted mb-3">
                {formatDateTime(order.created_at)} ·{" "}
                {order.status === "pending" ? "unpaid" : order.payment_method} · {order.created_by ?? "—"}
                {order.paid_at && <> · paid {formatDateTime(order.paid_at)}</>}
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

              {order.status === "pending" && (
                <div className="mt-4">
                  <MarkPaidButtons orderId={order.id} total={Number(order.total)} />
                </div>
              )}

              {(order.status === "completed" || order.status === "pending") && (
                <div className="flex flex-wrap items-center gap-5 mt-4 pt-4">
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
                  <div className="ml-auto">
                    <PrintReceiptButtons data={receiptFromOrder(order)} compact />
                  </div>
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
          clients={clients}
          onClose={() => setEditingOrder(null)}
          onSave={editOrderAction}
        />
      )}
    </div>
  );
}
