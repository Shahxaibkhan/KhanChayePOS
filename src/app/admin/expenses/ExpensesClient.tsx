"use client";

import { useMemo, useState } from "react";
import type { Expense } from "@/lib/types";
import { formatDate, formatMoney, todayISO } from "@/lib/date";
import { createExpenseAction, deleteExpenseAction, updateExpenseAction } from "./actions";

type FormState = {
  description: string;
  category: string;
  amount: number;
  expenseDate: string;
};

function emptyForm(): FormState {
  return { description: "", category: "", amount: 0, expenseDate: todayISO() };
}

export default function ExpensesClient({ expenses }: { expenses: Expense[] }) {
  const [editing, setEditing] = useState<Expense | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(expenses.map((e) => e.category))], [expenses]);
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-xl tracking-wide">Expenses</h1>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white text-sm font-semibold"
        >
          + Add Expense
        </button>
      </div>
      <p className="text-kc-muted text-sm mb-6">
        Last 90 days · Total {formatMoney(total)}
      </p>

      <div className="rounded-2xl border border-kc-gold/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-kc-charcoal-2 text-kc-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Description</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-kc-muted py-10">
                  No expenses logged yet.
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="border-t border-kc-gold/5 hover:bg-kc-charcoal-2/60">
                  <td className="px-4 py-3 text-kc-muted whitespace-nowrap">{formatDate(exp.expense_date)}</td>
                  <td className="px-4 py-3 text-kc-cream">{exp.description}</td>
                  <td className="px-4 py-3 text-kc-muted">{exp.category}</td>
                  <td className="px-4 py-3 text-right text-kc-gold-light">{formatMoney(Number(exp.amount))}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => setEditing(exp)} className="text-xs text-kc-gold-light hover:underline">
                        Edit
                      </button>
                      <button onClick={() => setDeletingId(exp.id)} className="text-xs text-kc-red hover:underline">
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
        <ExpenseModal
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
            await deleteExpenseAction(deletingId);
            setDeletingId(null);
          }}
        />
      )}
    </div>
  );
}

function ExpenseModal({
  initial,
  categories,
  onClose,
}: {
  initial?: Expense;
  categories: string[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          description: initial.description,
          category: initial.category,
          amount: Number(initial.amount),
          expenseDate: initial.expense_date,
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
        await updateExpenseAction(initial.id, form);
      } else {
        await createExpenseAction(form);
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
        <h3 className="font-display text-lg mb-4">{initial ? "Edit Expense" : "Add Expense"}</h3>

        <div className="space-y-3">
          <Field label="Description">
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
              autoFocus
              placeholder="e.g. Milk delivery"
            />
          </Field>

          <Field label="Category">
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
              list="expense-category-options"
              placeholder="e.g. Supplies"
            />
            <datalist id="expense-category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (Rs)">
              <input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
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
        <h3 className="font-display text-lg mb-2">Delete this expense?</h3>
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
