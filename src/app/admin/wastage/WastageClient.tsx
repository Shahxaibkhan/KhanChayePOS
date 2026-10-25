"use client";

import { useMemo, useState } from "react";
import type { Item, Wastage } from "@/lib/types";
import { formatDate, formatMoney, todayISO } from "@/lib/date";
import { createWastageAction, deleteWastageAction, updateWastageAction } from "./actions";

type FormState = {
  itemId: string | null;
  description: string;
  category: string;
  quantity: number;
  estimatedCost: number;
  wastageDate: string;
};

function emptyForm(): FormState {
  return {
    itemId: null,
    description: "",
    category: "Raw Material",
    quantity: 1,
    estimatedCost: 0,
    wastageDate: todayISO(),
  };
}

export default function WastageClient({ wastage, items }: { wastage: Wastage[]; items: Item[] }) {
  const [editing, setEditing] = useState<Wastage | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(wastage.map((w) => w.category))], [wastage]);
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i.name])), [items]);
  const total = wastage.reduce((s, w) => s + Number(w.estimated_cost), 0);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-xl tracking-wide">Wastage</h1>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white text-sm font-semibold"
        >
          + Log Wastage
        </button>
      </div>
      <p className="text-kc-muted text-sm mb-6">
        Last 90 days · Total {formatMoney(total)} · spoiled, burnt, or dropped stock — separate from cash expenses
      </p>

      <div className="rounded-2xl border border-kc-gold/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-kc-charcoal-2 text-kc-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Description</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-right px-4 py-3">Qty</th>
              <th className="text-right px-4 py-3">Cost</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {wastage.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-kc-muted py-10">
                  Nothing logged yet.
                </td>
              </tr>
            ) : (
              wastage.map((w) => (
                <tr key={w.id} className="border-t border-kc-gold/5 hover:bg-kc-charcoal-2/60">
                  <td className="px-4 py-3 text-kc-muted whitespace-nowrap">{formatDate(w.wastage_date)}</td>
                  <td className="px-4 py-3 text-kc-cream">
                    {w.description}
                    {w.item_id && itemsById.get(w.item_id) && (
                      <span className="text-kc-muted"> · {itemsById.get(w.item_id)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-kc-muted">{w.category}</td>
                  <td className="px-4 py-3 text-right text-kc-cream">{w.quantity}</td>
                  <td className="px-4 py-3 text-right text-kc-gold-light">{formatMoney(Number(w.estimated_cost))}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => setEditing(w)} className="text-xs text-kc-gold-light hover:underline">
                        Edit
                      </button>
                      <button onClick={() => setDeletingId(w.id)} className="text-xs text-kc-red hover:underline">
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
        <WastageModal
          initial={editing ?? undefined}
          categories={categories}
          items={items}
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
            await deleteWastageAction(deletingId);
            setDeletingId(null);
          }}
        />
      )}
    </div>
  );
}

function WastageModal({
  initial,
  categories,
  items,
  onClose,
}: {
  initial?: Wastage;
  categories: string[];
  items: Item[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          itemId: initial.item_id,
          description: initial.description,
          category: initial.category,
          quantity: initial.quantity,
          estimatedCost: Number(initial.estimated_cost),
          wastageDate: initial.wastage_date,
        }
      : emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await updateWastageAction(initial.id, form);
      } else {
        await createWastageAction(form);
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
      <div className="bg-kc-charcoal border border-kc-gold/20 rounded-3xl p-6 w-full max-w-sm">
        <h3 className="font-display text-lg mb-4">{initial ? "Edit Wastage" : "Log Wastage"}</h3>

        <div className="space-y-3">
          <Field label="Description">
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
              autoFocus
              placeholder="e.g. Milk spoiled, Paratha burnt"
            />
          </Field>

          <Field label="Linked menu item (optional)">
            <select
              value={form.itemId ?? ""}
              onChange={(e) => setForm({ ...form, itemId: e.target.value || null })}
              className={inputClass}
            >
              <option value="">— none / raw material —</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Category">
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
              list="wastage-category-options"
            />
            <datalist id="wastage-category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity">
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="Estimated cost (Rs)">
              <input
                type="number"
                min={0}
                value={form.estimatedCost}
                onChange={(e) => setForm({ ...form, estimatedCost: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Date">
            <input
              type="date"
              value={form.wastageDate}
              onChange={(e) => setForm({ ...form, wastageDate: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        {error && <p className="text-xs text-kc-red mt-3">{error}</p>}

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-kc-gold/15 text-kc-muted hover:text-kc-cream text-sm"
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
      <div className="bg-kc-charcoal border border-kc-gold/20 rounded-3xl p-6 w-full max-w-sm text-center">
        <h3 className="font-display text-lg mb-2">Delete this entry?</h3>
        <p className="text-kc-muted text-sm mb-6">This can&apos;t be undone.</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-kc-gold/15 text-kc-muted hover:text-kc-cream text-sm"
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
  "w-full h-10 rounded-xl bg-kc-charcoal-2 border border-kc-gold/15 px-3 text-sm text-kc-cream placeholder:text-kc-muted focus:outline-none focus:border-kc-orange/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-kc-muted mb-1">{label}</span>
      {children}
    </label>
  );
}
