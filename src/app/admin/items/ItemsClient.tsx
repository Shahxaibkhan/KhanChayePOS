"use client";

import { useMemo, useState } from "react";
import type { Item } from "@/lib/types";
import type { ItemInput } from "@/lib/data/items";
import { formatMoney } from "@/lib/date";
import { createItemAction, deleteItemAction, updateItemAction } from "./actions";

type FormState = ItemInput;

const emptyForm: FormState = {
  name: "",
  category: "",
  price: 0,
  cost: 0,
  sortOrder: 0,
  isActive: true,
};

export default function ItemsClient({ items }: { items: Item[] }) {
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category))], [items]);

  return (
    <div className="px-5 sm:px-8 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-7">
        <h1 className="font-display text-xl tracking-wide">Items</h1>
        <button
          onClick={() => setCreating(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white text-sm font-semibold"
        >
          + Add Item
        </button>
      </div>

      <div className="rounded-2xl bg-kc-charcoal-2 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-kc-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-4">Name</th>
              <th className="text-left px-5 py-4">Category</th>
              <th className="text-right px-5 py-4">Price</th>
              <th className="text-right px-5 py-4">Cost</th>
              <th className="text-center px-5 py-4">Active</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-kc-charcoal-3">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-kc-muted py-12">
                  No items yet. Add your first one.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-kc-charcoal-3/50 transition">
                  <td className="px-5 py-4 text-kc-cream">{item.name}</td>
                  <td className="px-5 py-4 text-kc-muted">{item.category}</td>
                  <td className="px-5 py-4 text-right text-kc-gold-light">{formatMoney(item.price)}</td>
                  <td className="px-5 py-4 text-right text-kc-muted">{formatMoney(item.cost)}</td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        item.is_active ? "bg-kc-green" : "bg-kc-muted"
                      }`}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-4">
                      <button
                        onClick={() => setEditing(item)}
                        className="text-xs text-kc-gold-light hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingId(item.id)}
                        className="text-xs text-kc-red hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <ItemModal
          initial={editing ?? undefined}
          categories={categories}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {deletingId && (
        <ConfirmDeleteModal
          onCancel={() => setDeletingId(null)}
          onConfirm={async () => {
            await deleteItemAction(deletingId);
            setDeletingId(null);
          }}
        />
      )}
    </div>
  );
}

function ItemModal({
  initial,
  categories,
  onClose,
}: {
  initial?: Item;
  categories: string[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          name: initial.name,
          category: initial.category,
          price: initial.price,
          cost: initial.cost,
          sortOrder: initial.sort_order,
          isActive: initial.is_active,
        }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await updateItemAction(initial.id, form);
      } else {
        await createItemAction(form);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-kc-charcoal rounded-3xl p-7 w-full max-w-sm shadow-2xl">
        <h3 className="font-display text-lg mb-5">{initial ? "Edit Item" : "Add Item"}</h3>

        <div className="space-y-4">
          <Field label="Name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              autoFocus
            />
          </Field>

          <Field label="Category">
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
              list="category-options"
              placeholder="e.g. Chaye"
            />
            <datalist id="category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (Rs)">
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="Cost (Rs)">
              <input
                type="number"
                min={0}
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Sort order">
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>

          <label className="flex items-center gap-2.5 text-sm text-kc-cream/90 pt-1">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="accent-kc-orange h-4 w-4"
            />
            Active (shows up on the POS)
          </label>
        </div>

        {error && <p className="text-xs text-kc-red mt-4">{error}</p>}

        <div className="flex gap-3 mt-7">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-kc-charcoal-2 text-kc-muted hover:text-kc-cream text-sm"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 h-11 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white font-semibold text-sm disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-kc-charcoal rounded-3xl p-7 w-full max-w-sm text-center shadow-2xl">
        <h3 className="font-display text-lg mb-2">Delete this item?</h3>
        <p className="text-kc-muted text-sm mb-7">
          It will disappear from the POS. Past orders that used it are unaffected.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl bg-kc-charcoal-2 text-kc-muted hover:text-kc-cream text-sm"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setBusy(true);
              await onConfirm();
            }}
            disabled={busy}
            className="flex-1 h-11 rounded-xl bg-kc-red text-white font-semibold text-sm disabled:opacity-40"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full h-11 rounded-xl bg-kc-charcoal-2 px-3.5 text-sm text-kc-cream placeholder:text-kc-muted focus:outline-none focus:ring-2 focus:ring-kc-orange/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-kc-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}
