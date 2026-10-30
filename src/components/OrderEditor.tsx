"use client";

import { useMemo, useState } from "react";
import type { CartLine, Client, Item, OrderWithItems, PaymentMethod } from "@/lib/types";
import { formatMoney } from "@/lib/date";
import { PARCEL_FEE_PER_CUP } from "@/lib/constants";
import { groupItemsForDisplay, type DisplayRow } from "@/lib/groupItems";
import ClientPicker from "@/components/ClientPicker";

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
  clients,
  onClose,
  onSave,
}: {
  order: OrderWithItems;
  items: Item[];
  clients: Client[];
  onClose: () => void;
  onSave: (
    orderId: string,
    lines: CartLine[],
    paymentMethod: PaymentMethod,
    note: string,
    clientName: string
  ) => Promise<EditResult>;
}) {
  const [cart, setCart] = useState<Record<string, CartLine>>(() => cartFromOrder(order));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order.payment_method);
  const [note, setNote] = useState(order.note ?? "");
  const [clientName, setClientName] = useState(order.client_name ?? "");
  const [activeCategory, setActiveCategory] = useState("All");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return ["All", ...set];
  }, [items]);
  const visibleItems = activeCategory === "All" ? items : items.filter((i) => i.category === activeCategory);
  const rows = useMemo(() => groupItemsForDisplay(visibleItems), [visibleItems]);

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
    const result = await onSave(order.id, lines, paymentMethod, note.trim(), clientName.trim());
    setSaving(false);
    if (result.ok) {
      onClose();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="bg-kc-charcoal rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5">
          <h3 className="font-display text-lg">Edit Order #{order.order_number}</h3>
          <button onClick={onClose} className="text-kc-muted hover:text-kc-cream text-sm">
            Close ✕
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Add items */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex gap-2 overflow-x-auto px-6 pb-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition ${
                    activeCategory === cat
                      ? "bg-kc-orange text-white"
                      : "bg-kc-charcoal-2 text-kc-muted hover:text-kc-cream"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-4 max-h-60 md:max-h-none">
              <div className="space-y-2">
                {rows.map((row) => (
                  <PickerRow key={pickerRowKey(row)} row={row} cart={cart} onAdd={addItem} />
                ))}
              </div>
            </div>
          </div>

          {/* Current lines */}
          <div className="w-full md:w-[380px] shrink-0 flex flex-col min-h-0 bg-kc-charcoal-2/40">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {lines.length === 0 ? (
                <p className="text-kc-muted text-sm text-center mt-6">No items — tap some to add, or cancel this order instead.</p>
              ) : (
                Object.entries(cart).map(([key, line]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-kc-cream truncate">{line.name}</div>
                        <div className="text-xs text-kc-muted mt-0.5">{formatMoney(line.unitPrice)} each</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setQty(key, line.quantity - 1)}
                          className="h-7 w-7 rounded-full bg-kc-charcoal-3 text-kc-cream text-sm hover:opacity-80"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm">{line.quantity}</span>
                        <button
                          onClick={() => setQty(key, line.quantity + 1)}
                          className="h-7 w-7 rounded-full bg-kc-charcoal-3 text-kc-cream text-sm hover:opacity-80"
                        >
                          +
                        </button>
                        <button onClick={() => removeLine(key)} className="text-kc-muted hover:text-kc-red text-xs ml-1">
                          ✕
                        </button>
                      </div>
                    </div>

                    {line.parcelQty === 0 ? (
                      <button
                        onClick={() => setParcelQty(key, 1)}
                        className="text-[11px] text-kc-muted hover:text-kc-gold-light mt-1.5"
                      >
                        🥡 Mark as parcel +{formatMoney(PARCEL_FEE_PER_CUP)}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between mt-1.5 bg-kc-charcoal-3 rounded-lg px-3 py-1.5">
                        <span className="text-[11px] text-kc-gold-light">🥡 Parcel · +{formatMoney(PARCEL_FEE_PER_CUP)}/cup</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setParcelQty(key, line.parcelQty - 1)}
                            className="h-5 w-5 rounded-full text-kc-muted text-xs hover:text-kc-cream"
                          >
                            −
                          </button>
                          <span className="w-4 text-center text-[11px] text-kc-gold-light">{line.parcelQty}</span>
                          <button
                            onClick={() => setParcelQty(key, line.parcelQty + 1)}
                            disabled={line.parcelQty >= line.quantity}
                            className="h-5 w-5 rounded-full text-kc-muted text-xs hover:text-kc-cream disabled:opacity-30"
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
                    className={`flex-1 py-2 rounded-xl text-[11px] uppercase tracking-wide font-medium transition ${
                      paymentMethod === pm
                        ? "bg-kc-gold/20 text-kc-gold-light"
                        : "bg-kc-charcoal-3 text-kc-muted hover:text-kc-cream"
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
                className="w-full h-10 rounded-xl bg-kc-charcoal-3 px-3.5 text-sm placeholder:text-kc-muted focus:outline-none focus:ring-2 focus:ring-kc-orange/50"
              />
              {error && <p className="text-xs text-kc-red">{error}</p>}
              <div className="flex items-center justify-between">
                <span className="text-kc-muted text-sm">Total</span>
                <span className="text-kc-gold-light font-display text-lg">{formatMoney(total)}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 h-11 rounded-xl bg-kc-charcoal-3 text-kc-muted hover:text-kc-cream text-sm"
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

function pickerRowKey(row: DisplayRow): string {
  return row.kind === "single" ? row.item.id : `variant-${row.baseName}-${row.variants[0].item.category}`;
}

function PickerRow({
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
        className={`relative w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition active:scale-[0.98] ${
          qty > 0 ? "bg-kc-orange/15 ring-2 ring-kc-orange" : "bg-kc-charcoal-2 hover:bg-kc-charcoal-3"
        }`}
      >
        <span className="text-sm text-kc-cream">{item.name}</span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-kc-gold-light font-medium">{formatMoney(item.price)}</span>
          {qty > 0 && (
            <span className="h-6 w-6 rounded-full bg-kc-orange text-white text-xs font-bold flex items-center justify-center">
              {qty}
            </span>
          )}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-kc-charcoal-2 px-4 py-3">
      <div className="text-sm text-kc-cream mb-2">{row.baseName}</div>
      <div className="flex gap-2">
        {row.variants.map(({ label, item }) => {
          const qty = cart[item.id]?.quantity ?? 0;
          return (
            <button
              key={item.id}
              onClick={() => onAdd(item)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition active:scale-[0.97] ${
                qty > 0 ? "bg-kc-orange/20 ring-2 ring-kc-orange" : "bg-kc-charcoal-3 hover:bg-kc-charcoal-3/70"
              }`}
            >
              <span className="text-xs text-kc-cream">{label}</span>
              <span className="text-xs text-kc-gold-light font-medium">{formatMoney(item.price)}</span>
              {qty > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-kc-orange text-white text-[10px] font-bold flex items-center justify-center">
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
