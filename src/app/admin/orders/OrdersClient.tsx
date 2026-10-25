"use client";

import { useState } from "react";
import type { OrderWithItems } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/date";
import { returnOrderAction, voidOrderAction } from "./actions";

export default function OrdersClient({ orders }: { orders: OrderWithItems[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {orders.length === 0 ? (
        <p className="text-kc-muted text-sm text-center py-16">No orders in this range.</p>
      ) : (
        orders.map((order) => {
          const expanded = expandedId === order.id;
          return (
            <div
              key={order.id}
              className={`rounded-2xl border overflow-hidden ${
                order.status === "voided"
                  ? "border-kc-red/20 bg-kc-red/5 opacity-60"
                  : order.status === "returned"
                    ? "border-kc-gold/30 bg-kc-gold/5 opacity-70"
                    : "border-kc-gold/10 bg-kc-charcoal-2"
              }`}
            >
              <button
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => setExpandedId(expanded ? null : order.id)}
              >
                <div>
                  <div className="text-sm font-medium">
                    Order #{order.order_number}
                    {order.status === "voided" && <span className="ml-2 text-xs text-kc-red uppercase">Voided</span>}
                    {order.status === "returned" && (
                      <span className="ml-2 text-xs text-kc-gold-light uppercase">Returned</span>
                    )}
                  </div>
                  <div className="text-xs text-kc-muted">
                    {formatDateTime(order.created_at)} · {order.payment_method} · {order.created_by ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-kc-gold-light font-semibold">{formatMoney(Number(order.total))}</span>
                  <span className="text-kc-muted text-xs">{expanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 border-t border-kc-gold/10 pt-3">
                  <div className="text-xs text-kc-cream/80 space-y-0.5 mb-3">
                    {order.order_items.map((li) => (
                      <div key={li.id} className="flex justify-between">
                        <span>
                          {li.quantity} × {li.item_name}
                        </span>
                        <span>{formatMoney(Number(li.line_total))}</span>
                      </div>
                    ))}
                  </div>
                  {order.note && <div className="text-xs text-kc-muted italic mb-3">“{order.note}”</div>}
                  {order.status === "completed" && (
                    <div className="flex items-center gap-4">
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
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
