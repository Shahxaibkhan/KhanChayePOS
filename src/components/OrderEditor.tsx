"use client";

import { useMemo, useState } from "react";
import type { CartLine, Item, OrderWithItems, PaymentMethod } from "@/lib/types";
import { formatMoney } from "@/lib/date";
import { PARCEL_FEE_PER_CUP } from "@/lib/constants";

function lineTotal(line: CartLine): number {
  return line.unitPrice * line.quantity + line.parcelQty * PARCEL_FEE_PER_CUP;
}

function cartFromOrder(order: OrderWithItems): Record<string, CartLine> {
  const cart: Record<string, CartLine> = {};
  for (const li of order.order_items) {
    const key = li.item_id ?? `legacy-${li.id}`;
    cart[key] = {
      itemId: li.item_id ?? "",
      name: li.item_name,
      unitPrice: Number(li.unit_price),
      quantity: li.quantity,
      parcelQty: li.parcel_qty,
    };
  }
  return cart;
}

export type EditResult = { ok: true } | { ok: false; error: string };

export default function OrderEditor({
  order,
  items,
  onClose,
  onSave,
}: {
  order: OrderWithItems;
  items: Item[];
  onClose: () => void;
  onSave: (orderId: string, lines: CartLine[], paymentMethod: PaymentMethod, note: string) => Promise<EditResult>;
}) {
  const [cart, setCart] = useState<Record<string, CartLine>>(() => cartFromOrder(order));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order.payment_method);
  const [note, setNote] = useState(order.note ?? "");
  const [activeCategory, setActiveCategory] = useState("All");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return ["All", ...set];
  }, [items]);
  const visibleItems = activeCategory === "All" ? items : items.filter((i) => i.category === activeCategory);

  const lines = Object.values(cart);
  const total = lines.reduce((s, l) => s + lineTotal(l), 0);

  function keyFor(item: Item) {
    return item.id;
  }

  function addItem(item: Item) {
    setCart((prev) => {
      const key = keyFor(item);
      const existing = prev[key];
      const quantity = (existing?.quantity ?? 0) + 1;
      return {
        ...prev,
        [key]: { itemId: item.id, name: item.name, unitPrice: item.price, quantity, parcelQty: existing?.parcelQty ?? 0 },
      };
    });
  }

  function setQty(key: string, quantity: number) {
    setCart((prev) => {
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      const existing = prev[key];
      return { ...prev, [key]: { ...existing, quantity, parcelQty: Math.min(existing.parcelQty, quantity) } };
    });
  }

  function setParcelQty(key: string, parcelQty: number) {
    setCart((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      return { ...prev, [key]: { ...existing, parcelQty: Math.max(0, Math.min(parcelQty, existing.quantity)) } };
    });
  }

  function removeLine(key: string) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function save() {
    if (!lines.length || saving) return;
    setSaving(true);
    setError(null);
    const result = await onSave(order.id, lines, paymentMethod, note.trim());
    setSaving(false);
    if (result.ok) {
      onClose();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="bg-kc-charcoal border border-kc-gold/20 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-kc-gold/10">
          <h3 className="font-display text-lg">Edit Order #{order.order_number}</h3>
          <button onClick={onClose} className="text-kc-muted hover:text-kc-cream text-sm">
            Close ✕
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Add items */}
          <div className="flex-1 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-kc-gold/10">
            <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-kc-gold/10">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition ${
                    activeCategory === cat
                      ? "bg-kc-orange border-kc-orange text-white"
                      : "border-kc-gold/20 text-kc-muted hover:border-kc-orange/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 max-h-64 md:max-h-none">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {visibleItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    className="text-left rounded-xl border border-kc-gold/15 bg-kc-charcoal-2 p-3 hover:border-kc-orange/50 active:scale-[0.97] transition"
                  >
                    <div className="text-xs text-kc-cream mb-0.5">{item.name}</div>
                    <div className="text-xs text-kc-gold-light font-medium">{formatMoney(item.price)}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Current lines */}
          <div className="w-full md:w-[340px] shrink-0 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {lines.length === 0 ? (
                <p className="text-kc-muted text-sm text-center mt-6">No items — tap some to add, or cancel this order instead.</p>
              ) : (
                Object.entries(cart).map(([key, line]) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-kc-cream truncate">{line.name}</div>
                        <div className="text-xs text-kc-muted">{formatMoney(line.unitPrice)} each</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setQty(key, line.quantity - 1)}
                          className="h-6 w-6 rounded-full border border-kc-gold/20 text-kc-cream text-xs hover:border-kc-orange/60"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm">{line.quantity}</span>
                        <button
                          onClick={() => setQty(key, line.quantity + 1)}
                          className="h-6 w-6 rounded-full border border-kc-gold/20 text-kc-cream text-xs hover:border-kc-orange/60"
                        >
                          +
                        </button>
                        <button onClick={() => removeLine(key)} className="text-kc-muted hover:text-kc-red text-xs ml-1">
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pl-0.5">
                      <span className="text-[11px] text-kc-muted">🥡 Parcel (+{formatMoney(PARCEL_FEE_PER_CUP)}/cup)</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setParcelQty(key, line.parcelQty - 1)}
                          disabled={line.parcelQty <= 0}
                          className="h-5 w-5 rounded-full border border-kc-gold/15 text-kc-muted text-xs disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-[11px] text-kc-gold-light">{line.parcelQty}</span>
                        <button
                          onClick={() => setParcelQty(key, line.parcelQty + 1)}
                          disabled={line.parcelQty >= line.quantity}
                          className="h-5 w-5 rounded-full border border-kc-gold/15 text-kc-muted text-xs disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-4 border-t border-kc-gold/10 space-y-3">
              <div className="flex gap-2">
                {(["cash", "card", "online"] as PaymentMethod[]).map((pm) => (
                  <button
                    key={pm}
                    onClick={() => setPaymentMethod(pm)}
                    className={`flex-1 py-1.5 rounded-xl text-[11px] uppercase tracking-wide border transition ${
                      paymentMethod === pm
                        ? "bg-kc-gold/15 border-kc-gold text-kc-gold-light"
                        : "border-kc-gold/15 text-kc-muted hover:border-kc-gold/40"
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="w-full h-9 rounded-xl bg-kc-charcoal-2 border border-kc-gold/15 px-3 text-sm placeholder:text-kc-muted focus:outline-none focus:border-kc-orange/50"
              />
              {error && <p className="text-xs text-kc-red">{error}</p>}
              <div className="flex items-center justify-between text-base font-semibold">
                <span className="text-kc-muted text-sm">Total</span>
                <span className="text-kc-gold-light font-display">{formatMoney(total)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 h-11 rounded-xl border border-kc-gold/15 text-kc-muted hover:text-kc-cream text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={!lines.length || saving}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white font-semibold text-sm disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
