"use client";

import { useMemo, useState } from "react";
import type { CartLine, Item, PaymentMethod } from "@/lib/types";
import { formatMoney } from "@/lib/date";
import { submitOrderAction } from "./actions";

export default function PosClient({ items }: { items: Item[] }) {
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return ["All", ...set];
  }, [items]);

  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ orderNumber: number; total: number } | null>(null);

  const visibleItems = activeCategory === "All" ? items : items.filter((i) => i.category === activeCategory);
  const lines = Object.values(cart);
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  function addItem(item: Item) {
    setCart((prev) => {
      const existing = prev[item.id];
      const quantity = (existing?.quantity ?? 0) + 1;
      return { ...prev, [item.id]: { itemId: item.id, name: item.name, unitPrice: item.price, quantity } };
    });
  }

  function setQty(itemId: string, quantity: number) {
    setCart((prev) => {
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: { ...prev[itemId], quantity } };
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
  }

  async function checkout() {
    if (!lines.length || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await submitOrderAction(lines, paymentMethod, note.trim());
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
        <div className="flex gap-2 overflow-x-auto px-4 sm:px-6 py-3 border-b border-kc-gold/10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm border transition ${
                activeCategory === cat
                  ? "bg-kc-orange border-kc-orange text-white"
                  : "border-kc-gold/20 text-kc-muted hover:border-kc-orange/50 hover:text-kc-cream"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 pb-28 md:pb-4">
          {visibleItems.length === 0 ? (
            <p className="text-kc-muted text-sm mt-8 text-center">
              No items in this category yet. Add some from Admin → Items.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleItems.map((item) => {
                const qty = cart[item.id]?.quantity ?? 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    className={`relative text-left rounded-2xl border p-4 transition active:scale-[0.97] ${
                      qty > 0
                        ? "border-kc-orange bg-kc-orange/10"
                        : "border-kc-gold/15 bg-kc-charcoal-2 hover:border-kc-gold/40"
                    }`}
                  >
                    {qty > 0 && (
                      <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-kc-orange text-white text-xs font-bold flex items-center justify-center shadow">
                        {qty}
                      </span>
                    )}
                    <div className="text-sm font-medium text-kc-cream mb-1">{item.name}</div>
                    <div className="text-kc-gold-light text-sm font-semibold">{formatMoney(item.price)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile cart toggle bar */}
      {!cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="md:hidden fixed inset-x-0 bottom-0 z-20 bg-gradient-to-r from-kc-orange to-kc-orange-2 text-white flex items-center justify-between px-6 py-4 font-semibold shadow-[0_-8px_24px_rgba(0,0,0,0.4)]"
        >
          <span>{totalQty > 0 ? `${totalQty} item${totalQty > 1 ? "s" : ""} in cart` : "Cart is empty"}</span>
          <span>{formatMoney(total)} ▸</span>
        </button>
      )}

      {/* Cart panel */}
      <div
        className={`${
          cartOpen ? "fixed inset-0 z-30 flex" : "hidden"
        } md:static md:flex md:z-auto w-full md:w-[360px] shrink-0 border-l border-kc-gold/10 bg-kc-charcoal flex-col`}
      >
        {cartOpen && (
          <div className="md:hidden absolute inset-0 bg-black/60" onClick={() => setCartOpen(false)} />
        )}
        <div className="relative mt-auto md:mt-0 w-full h-[85vh] md:h-auto md:flex-1 flex flex-col bg-kc-charcoal rounded-t-3xl md:rounded-none border-t md:border-t-0 border-kc-gold/10">
          <div className="flex items-center justify-between px-5 py-4 border-b border-kc-gold/10">
            <h2 className="font-display text-sm tracking-wide">CURRENT ORDER</h2>
            <button
              className="md:hidden text-kc-muted text-sm"
              onClick={() => setCartOpen(false)}
            >
              Close ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
            {lines.length === 0 ? (
              <p className="text-kc-muted text-sm text-center mt-10">Tap items to add them to the order.</p>
            ) : (
              lines.map((line) => (
                <div key={line.itemId} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-kc-cream truncate">{line.name}</div>
                    <div className="text-xs text-kc-muted">{formatMoney(line.unitPrice)} each</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setQty(line.itemId, line.quantity - 1)}
                      className="h-7 w-7 rounded-full border border-kc-gold/20 text-kc-cream hover:border-kc-orange/60"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm">{line.quantity}</span>
                    <button
                      onClick={() => setQty(line.itemId, line.quantity + 1)}
                      className="h-7 w-7 rounded-full border border-kc-gold/20 text-kc-cream hover:border-kc-orange/60"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(line.itemId)}
                      className="text-kc-muted hover:text-kc-red text-xs ml-1"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-5 py-4 border-t border-kc-gold/10 space-y-3">
            <div className="flex gap-2">
              {(["cash", "card", "online"] as PaymentMethod[]).map((pm) => (
                <button
                  key={pm}
                  onClick={() => setPaymentMethod(pm)}
                  className={`flex-1 py-2 rounded-xl text-xs uppercase tracking-wide border transition ${
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
              className="w-full h-10 rounded-xl bg-kc-charcoal-2 border border-kc-gold/15 px-3 text-sm placeholder:text-kc-muted focus:outline-none focus:border-kc-orange/50"
            />

            {error && <p className="text-xs text-kc-red">{error}</p>}

            <div className="flex items-center justify-between text-lg font-semibold pt-1">
              <span className="text-kc-muted text-sm">Total</span>
              <span className="text-kc-gold-light font-display">{formatMoney(total)}</span>
            </div>

            <div className="flex gap-2">
              {lines.length > 0 && (
                <button
                  onClick={clearCart}
                  className="px-4 h-12 rounded-xl border border-kc-gold/15 text-kc-muted hover:border-kc-red/50 hover:text-kc-red text-sm"
                >
                  Clear
                </button>
              )}
              <button
                onClick={checkout}
                disabled={!lines.length || submitting}
                className="flex-1 h-12 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white font-semibold disabled:opacity-40 active:scale-[0.98] transition"
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
          <div className="bg-kc-charcoal border border-kc-gold/20 rounded-3xl p-8 max-w-xs w-full text-center">
            <div className="h-14 w-14 rounded-full bg-kc-green/15 border border-kc-green/40 flex items-center justify-center mx-auto mb-4 text-kc-green text-2xl">
              ✓
            </div>
            <h3 className="font-display text-lg mb-1">Order #{receipt.orderNumber}</h3>
            <p className="text-kc-muted text-sm mb-6">{formatMoney(receipt.total)} — saved successfully</p>
            <button
              onClick={() => setReceipt(null)}
              className="w-full h-11 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white font-semibold"
            >
              New Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
