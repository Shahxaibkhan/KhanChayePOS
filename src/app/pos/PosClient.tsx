"use client";

import { useMemo, useState } from "react";
import type { CartLine, Client, Item, PaymentMethod } from "@/lib/types";
import { formatMoney } from "@/lib/date";
import { PARCEL_FEE_PER_CUP } from "@/lib/constants";
import { groupItemsForDisplay, type DisplayRow } from "@/lib/groupItems";
import ClientPicker from "@/components/ClientPicker";
import { submitOrderAction } from "./actions";

function lineTotal(line: CartLine): number {
  return line.unitPrice * line.quantity + line.parcelQty * PARCEL_FEE_PER_CUP;
}

export default function PosClient({ items, clients }: { items: Item[]; clients: Client[] }) {
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return ["All", ...set];
  }, [items]);

  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [clientName, setClientName] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ orderNumber: number; total: number } | null>(null);

  const visibleItems = activeCategory === "All" ? items : items.filter((i) => i.category === activeCategory);

  const sections = useMemo(() => {
    if (activeCategory !== "All") {
      return [{ category: activeCategory, rows: groupItemsForDisplay(visibleItems) }];
    }
    const byCategory = new Map<string, Item[]>();
    for (const item of visibleItems) {
      const list = byCategory.get(item.category) ?? [];
      list.push(item);
      byCategory.set(item.category, list);
    }
    return [...byCategory.entries()].map(([category, catItems]) => ({
      category,
      rows: groupItemsForDisplay(catItems),
    }));
  }, [visibleItems, activeCategory]);

  const lines = Object.values(cart);
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const parcelQtyTotal = lines.reduce((s, l) => s + l.parcelQty, 0);
  const parcelCharge = parcelQtyTotal * PARCEL_FEE_PER_CUP;
  const total = lines.reduce((s, l) => s + lineTotal(l), 0);

  function addItem(item: Item) {
    setCart((prev) => {
      const existing = prev[item.id];
      const quantity = (existing?.quantity ?? 0) + 1;
      return {
        ...prev,
        [item.id]: {
          itemId: item.id,
          name: item.name,
          unitPrice: item.price,
          quantity,
          parcelQty: existing?.parcelQty ?? 0,
        },
      };
    });
  }

  function setQty(itemId: string, quantity: number) {
    setCart((prev) => {
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      const existing = prev[itemId];
      return {
        ...prev,
        [itemId]: { ...existing, quantity, parcelQty: Math.min(existing.parcelQty, quantity) },
      };
    });
  }

  function setParcelQty(itemId: string, parcelQty: number) {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const clamped = Math.max(0, Math.min(parcelQty, existing.quantity));
      return { ...prev, [itemId]: { ...existing, parcelQty: clamped } };
    });
  }

  function removeItem(itemId: string) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  function clearCart() {
    setCart({});
    setNote("");
    setPaymentMethod("cash");
    setClientName("");
  }

  async function checkout() {
    if (!lines.length || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await submitOrderAction(lines, paymentMethod, note.trim(), clientName.trim());
    setSubmitting(false);
    if (result.ok) {
      setReceipt({ orderNumber: result.orderNumber, total: result.total });
      clearCart();
      setCartOpen(false);
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0">
      {/* Item grid */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex gap-2.5 overflow-x-auto px-5 sm:px-8 py-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-5 py-3 rounded-full text-[15px] font-medium transition ${
                activeCategory === cat
                  ? "bg-kc-orange text-white"
                  : "bg-kc-charcoal-2 text-kc-muted hover:text-kc-cream"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-2 pb-32 md:pb-6">
          {visibleItems.length === 0 ? (
            <p className="text-kc-muted text-sm mt-10 text-center">
              No items in this category yet. Add some from Admin → Items.
            </p>
          ) : (
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.category}>
                  {activeCategory === "All" && (
                    <h3 className="text-xs text-kc-muted uppercase tracking-[0.15em] mb-2.5 px-1">
                      {section.category}
                    </h3>
                  )}
                  <div className="space-y-2.5">
                    {section.rows.map((row) => (
                      <ItemRow key={rowKey(row)} row={row} cart={cart} onAdd={addItem} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile cart toggle bar */}
      {!cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="md:hidden fixed inset-x-0 bottom-0 z-20 bg-gradient-to-r from-kc-orange to-kc-orange-2 text-white flex items-center justify-between px-6 py-5 font-semibold shadow-[0_-8px_24px_rgba(0,0,0,0.4)]"
        >
          <span>{totalQty > 0 ? `${totalQty} item${totalQty > 1 ? "s" : ""} in cart` : "Cart is empty"}</span>
          <span>{formatMoney(total)} ▸</span>
        </button>
      )}

      {/* Cart panel */}
      <div
        className={`${
          cartOpen ? "fixed inset-0 z-30 flex" : "hidden"
        } md:static md:flex md:z-auto w-full md:w-[400px] shrink-0 bg-kc-charcoal flex-col`}
      >
        {cartOpen && (
          <div className="md:hidden absolute inset-0 bg-black/60" onClick={() => setCartOpen(false)} />
        )}
        <div className="relative mt-auto md:mt-0 w-full h-[88vh] md:h-auto md:flex-1 flex flex-col bg-kc-charcoal rounded-t-3xl md:rounded-none">
          <div className="flex items-center justify-between px-6 py-5">
            <h2 className="font-display text-sm tracking-wide text-kc-muted">CURRENT ORDER</h2>
            <button
              className="md:hidden text-kc-muted text-sm"
              onClick={() => setCartOpen(false)}
            >
              Close ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 space-y-5">
            {lines.length === 0 ? (
              <p className="text-kc-muted text-sm text-center mt-10">Tap items to add them to the order.</p>
            ) : (
              lines.map((line) => (
                <div key={line.itemId}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] text-kc-cream truncate">{line.name}</div>
                      <div className="text-xs text-kc-muted mt-0.5">{formatMoney(line.unitPrice)} each</div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        onClick={() => setQty(line.itemId, line.quantity - 1)}
                        className="h-9 w-9 rounded-full bg-kc-charcoal-2 text-kc-cream text-lg hover:bg-kc-charcoal-3"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm">{line.quantity}</span>
                      <button
                        onClick={() => setQty(line.itemId, line.quantity + 1)}
                        className="h-9 w-9 rounded-full bg-kc-charcoal-2 text-kc-cream text-lg hover:bg-kc-charcoal-3"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(line.itemId)}
                        className="h-9 w-9 rounded-full flex items-center justify-center text-kc-muted hover:text-kc-red text-sm"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {line.parcelQty === 0 ? (
                    <button
                      onClick={() => setParcelQty(line.itemId, 1)}
                      className="text-[11px] text-kc-muted hover:text-kc-gold-light mt-1.5"
                    >
                      🥡 Mark as parcel +{formatMoney(PARCEL_FEE_PER_CUP)}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between mt-1.5 bg-kc-charcoal-2 rounded-xl px-3 py-1.5">
                      <span className="text-[11px] text-kc-gold-light">
                        🥡 Parcel · +{formatMoney(PARCEL_FEE_PER_CUP)}/cup
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setParcelQty(line.itemId, line.parcelQty - 1)}
                          className="h-7 w-7 rounded-full text-kc-muted text-sm hover:text-kc-cream"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-[11px] text-kc-gold-light">{line.parcelQty}</span>
                        <button
                          onClick={() => setParcelQty(line.itemId, line.parcelQty + 1)}
                          disabled={line.parcelQty >= line.quantity}
                          className="h-7 w-7 rounded-full text-kc-muted text-sm hover:text-kc-cream disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="flex gap-2">
              {(["cash", "card", "online"] as PaymentMethod[]).map((pm) => (
                <button
                  key={pm}
                  onClick={() => setPaymentMethod(pm)}
                  className={`flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wide font-medium transition ${
                    paymentMethod === pm
                      ? "bg-kc-gold/20 text-kc-gold-light"
                      : "bg-kc-charcoal-2 text-kc-muted hover:text-kc-cream"
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>

            <ClientPicker clients={clients} value={clientName} onChange={setClientName} />

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full h-11 rounded-xl bg-kc-charcoal-2 px-4 text-sm placeholder:text-kc-muted focus:outline-none focus:ring-2 focus:ring-kc-orange/50"
            />

            {error && <p className="text-xs text-kc-red">{error}</p>}

            <div className="space-y-1.5 pt-1">
              {parcelQtyTotal > 0 && (
                <div className="flex items-center justify-between text-xs text-kc-muted">
                  <span>Parcel charge ({parcelQtyTotal} cup{parcelQtyTotal > 1 ? "s" : ""})</span>
                  <span>{formatMoney(parcelCharge)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-kc-muted text-sm">Total</span>
                <span className="text-kc-gold-light font-display text-xl">{formatMoney(total)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              {lines.length > 0 && (
                <button
                  onClick={clearCart}
                  className="px-5 h-13 rounded-xl bg-kc-charcoal-2 text-kc-muted hover:text-kc-red text-sm"
                >
                  Clear
                </button>
              )}
              <button
                onClick={checkout}
                disabled={!lines.length || submitting}
                className="flex-1 h-13 py-3.5 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white font-semibold text-[15px] disabled:opacity-40 active:scale-[0.98] transition"
              >
                {submitting ? "Placing…" : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success receipt */}
      {receipt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-6">
          <div className="bg-kc-charcoal rounded-3xl p-9 max-w-xs w-full text-center shadow-2xl">
            <div className="h-14 w-14 rounded-full bg-kc-green/15 flex items-center justify-center mx-auto mb-5 text-kc-green text-2xl">
              ✓
            </div>
            <h3 className="font-display text-lg mb-1.5">Order #{receipt.orderNumber}</h3>
            <p className="text-kc-muted text-sm mb-7">{formatMoney(receipt.total)} — saved successfully</p>
            <button
              onClick={() => setReceipt(null)}
              className="w-full h-12 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white font-semibold"
            >
              New Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function rowKey(row: DisplayRow): string {
  return row.kind === "single" ? row.item.id : `variant-${row.baseName}-${row.variants[0].item.category}`;
}

function ItemRow({
  row,
  cart,
  onAdd,
}: {
  row: DisplayRow;
  cart: Record<string, CartLine>;
  onAdd: (item: Item) => void;
}) {
  if (row.kind === "single") {
    const { item } = row;
    const qty = cart[item.id]?.quantity ?? 0;
    return (
      <button
        onClick={() => onAdd(item)}
        className={`relative w-full flex items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition active:scale-[0.98] ${
          qty > 0 ? "bg-kc-orange/15 ring-2 ring-kc-orange" : "bg-kc-charcoal-2 hover:bg-kc-charcoal-3"
        }`}
      >
        <span className="text-base font-medium text-kc-cream">{item.name}</span>
        <span className="flex items-center gap-3 shrink-0">
          <span className="text-kc-gold-light text-base font-semibold">{formatMoney(item.price)}</span>
          {qty > 0 && (
            <span className="h-7 w-7 rounded-full bg-kc-orange text-white text-sm font-bold flex items-center justify-center">
              {qty}
            </span>
          )}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-kc-charcoal-2 px-5 py-4">
      <div className="text-base font-medium text-kc-cream mb-3">{row.baseName}</div>
      <div className="flex gap-2.5">
        {row.variants.map(({ label, item }) => {
          const qty = cart[item.id]?.quantity ?? 0;
          return (
            <button
              key={item.id}
              onClick={() => onAdd(item)}
              className={`relative flex-1 flex items-center justify-center gap-2 rounded-xl py-3 transition active:scale-[0.97] ${
                qty > 0 ? "bg-kc-orange/20 ring-2 ring-kc-orange" : "bg-kc-charcoal-3 hover:bg-kc-charcoal-3/70"
              }`}
            >
              <span className="text-sm text-kc-cream">{label}</span>
              <span className="text-sm text-kc-gold-light font-semibold">{formatMoney(item.price)}</span>
              {qty > 0 && (
                <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-kc-orange text-white text-xs font-bold flex items-center justify-center">
                  {qty}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
