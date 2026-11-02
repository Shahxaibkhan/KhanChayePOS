"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Client, Item, OrderWithItems } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/date";
import OrderEditor from "@/components/OrderEditor";
import MarkPaidButtons from "@/components/MarkPaidButtons";
import { editOrderAction, returnOrderAction, voidOrderAction } from "./actions";

export default function OrdersClient({
  orders,
  items,
  clients,
}: {
  orders: OrderWithItems[];
  items: Item[];
  clients: Client[];
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderWithItems | null>(null);

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <p className="text-kc-muted text-sm text-center py-16">No orders in this range.</p>
      ) : (
        orders.map((order) => {
          const expanded = expandedId === order.id;
          return (
            <div
              key={order.id}
              className={`rounded-2xl overflow-hidden ${
                order.status === "voided"
                  ? "bg-kc-red/5 opacity-60"
                  : order.status === "returned"
                    ? "bg-kc-gold/5 opacity-70"
                    : order.status === "pending"
                      ? "bg-kc-charcoal-2 ring-2 ring-kc-orange/60"
                      : "bg-kc-charcoal-2"
              }`}
            >
              <button
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                onClick={() => setExpandedId(expanded ? null : order.id)}
              >
                <div>
                  <div className="text-sm font-medium">
                    Order #{order.order_number}
                    {order.client_name && (
                      // The whole row is a toggle <button>, so this can't be a nested <a>.
                      <span
                        role="link"
                        title={order.client_id ? `All orders for ${order.client_name}` : undefined}
                        onClick={(e) => {
                          if (!order.client_id) return;
                          e.stopPropagation();
                          router.push(`/pos/clients/${order.client_id}`);
                        }}
                        className={`ml-2 text-xs text-kc-gold-light bg-kc-gold/10 rounded-full px-2.5 py-0.5 ${
                          order.client_id ? "cursor-pointer hover:bg-kc-gold/25" : ""
                        }`}
                      >
                        {order.client_name}
                        {order.client_id && " ›"}
                      </span>
                    )}
                    {order.status === "pending" && (
                      <span className="ml-2 text-xs text-kc-orange uppercase font-semibold">⏳ Pending</span>
                    )}
                    {order.status === "voided" && <span className="ml-2 text-xs text-kc-red uppercase">Voided</span>}
                    {order.status === "returned" && (
                      <span className="ml-2 text-xs text-kc-gold-light uppercase">Returned</span>
                    )}
                  </div>
                  <div className="text-xs text-kc-muted mt-1">
                    {formatDateTime(order.created_at)} ·{" "}
                    {order.status === "pending" ? "unpaid" : order.payment_method} · {order.created_by ?? "—"}
                    {order.paid_at && <> · paid {formatDateTime(order.paid_at)} by {order.paid_by}</>}
                    {order.edited_at && <> · edited by {order.edited_by}</>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-kc-gold-light font-semibold">{formatMoney(Number(order.total))}</span>
                  <span className="text-kc-muted text-xs">{expanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {expanded && (
                <div className="px-5 pb-5 pt-1">
                  <div className="text-xs text-kc-cream/80 space-y-1 mb-4">
                    {order.order_items.map((li) => (
                      <div key={li.id} className="flex justify-between">
                        <span>
                          {li.quantity} × {li.item_name}
                          {li.parcel_qty > 0 && (
                            <span className="text-kc-muted"> · 🥡 {li.parcel_qty} parcel</span>
                          )}
                        </span>
                        <span>{formatMoney(Number(li.line_total))}</span>
                      </div>
                    ))}
                  </div>
                  {order.note && <div className="text-xs text-kc-muted italic mb-4">“{order.note}”</div>}
                  {order.status === "pending" && (
                    <div className="mb-4">
                      <MarkPaidButtons orderId={order.id} total={Number(order.total)} />
                    </div>
                  )}
                  {(order.status === "completed" || order.status === "pending") && (
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => setEditingOrder(order)}
                        className="text-xs text-kc-gold-light hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        disabled={voidingId === order.id}
                        onClick={async () => {
                          if (
                            !confirm(`Void order #${order.order_number}? This won't delete it, just marks it voided.`)
                          )
                            return;
                          setVoidingId(order.id);
                          await voidOrderAction(order.id);
                          setVoidingId(null);
                        }}
                        className="text-xs text-kc-red hover:underline disabled:opacity-40"
                      >
                        {voidingId === order.id ? "Voiding…" : "Void this order"}
                      </button>
                      {order.status === "completed" && (
                        <button
                          disabled={returningId === order.id}
                          onClick={async () => {
                            if (
                              !confirm(
                                `Mark order #${order.order_number} as returned? Use this when a customer returns/refunds an order that was already served.`
                              )
                            )
                              return;
                            setReturningId(order.id);
                            await returnOrderAction(order.id);
                            setReturningId(null);
                          }}
                          className="text-xs text-kc-gold-light hover:underline disabled:opacity-40"
                        >
                          {returningId === order.id ? "Marking…" : "Mark as returned"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
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
