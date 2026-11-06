"use client";

import { useState } from "react";
import type { Ingredient } from "@/lib/types";
import {
  countAction,
  createIngredientAction,
  deleteIngredientAction,
  restockAction,
  updateIngredientAction,
  type ActionResult,
} from "@/lib/actions/inventory-actions";
import { formatQty } from "@/lib/qty";

type Mode = { id: string; kind: "restock" | "count" | "edit" } | null;

/**
 * Stock levels with "add delivery" and "stock count" for everyone; with
 * `canManage` (admin) also add / edit / delete ingredients.
 */
export default function StockList({ ingredients, canManage = false }: { ingredients: Ingredient[]; canManage?: boolean }) {
  const [mode, setMode] = useState<Mode>(null);
  const [adding, setAdding] = useState(false);
  // Low stock first, then by name.
  const sorted = [...ingredients].sort(
    (a, b) => Number(b.stock <= b.low_threshold) - Number(a.stock <= a.low_threshold) || a.name.localeCompare(b.name)
  );

  if (!ingredients.length && !canManage) {
    return (
      <p className="text-kc-muted text-sm text-center mt-10">
        Inventory isn&apos;t set up yet — ask the admin to run the inventory migration.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((g) => {
        const low = g.stock <= g.low_threshold;
        const empty = g.stock <= 0;
        // Bar is full at 3x the alert level.
        const pct = Math.max(0, Math.min(100, (g.stock / Math.max(g.low_threshold * 3, 0.001)) * 100));
        const active = mode?.id === g.id ? mode.kind : null;
        return (
          <div
            key={g.id}
            className={`rounded-2xl px-5 py-4 ${low ? "bg-kc-red/10 ring-1 ring-kc-red/40" : "bg-kc-charcoal-2"}`}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex-1 min-w-[140px]">
                <div className="text-sm font-medium text-kc-cream">
                  {g.name}
                  {low && (
                    <span className="ml-2 text-[11px] font-semibold uppercase text-kc-red">
                      {empty ? "⚠ Out of stock" : "⚠ Low — refill"}
                    </span>
                  )}
                </div>
                <div className="text-xs text-kc-muted mt-0.5">Alert below {formatQty(g.low_threshold, g.unit)}</div>
              </div>
              <div className={`font-display text-lg ${low ? "text-kc-red" : "text-kc-gold-light"}`}>
                {formatQty(g.stock, g.unit)}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode(active === "restock" ? null : { id: g.id, kind: "restock" })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-kc-green/15 text-kc-green hover:bg-kc-green/25"
                >
                  + Delivery
                </button>
                <button
                  onClick={() => setMode(active === "count" ? null : { id: g.id, kind: "count" })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-kc-charcoal-3 text-kc-cream hover:opacity-80"
                >
                  Count
                </button>
                {canManage && (
                  <button
                    onClick={() => setMode(active === "edit" ? null : { id: g.id, kind: "edit" })}
                    className="px-3 py-1.5 rounded-lg text-xs text-kc-gold-light hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-kc-charcoal-3 mt-3 overflow-hidden">
              <div className={`h-full rounded-full ${low ? "bg-kc-red" : "bg-kc-green"}`} style={{ width: `${pct}%` }} />
            </div>

            {active === "restock" && (
              <QtyForm
                label={`Delivery received (${g.unit})`}
                hint="Added to current stock"
                withNote
                onCancel={() => setMode(null)}
                onSubmit={(qty, note) => restockAction(g.id, qty, note)}
              />
            )}
            {active === "count" && (
              <QtyForm
                label={`Actual amount on the shelf (${g.unit})`}
                hint="Replaces the stock level with what you counted"
                initial={Math.max(0, Number(g.stock.toFixed(3)))}
                onCancel={() => setMode(null)}
                onSubmit={(qty) => countAction(g.id, qty)}
              />
            )}
            {active === "edit" && (
              <IngredientForm
                initial={g}
                onCancel={() => setMode(null)}
                onDelete={async () => {
                  if (!confirm(`Delete ${g.name}? Its recipe links are removed too.`)) return { ok: true };
                  return deleteIngredientAction(g.id);
                }}
                onSubmit={(input) => updateIngredientAction(g.id, input)}
              />
            )}
          </div>
        );
      })}

      {canManage &&
        (adding ? (
          <div className="rounded-2xl bg-kc-charcoal-2 px-5 py-4">
            <IngredientForm
              onCancel={() => setAdding(false)}
              onSubmit={async (input) => {
                const r = await createIngredientAction(input);
                if (r.ok) setAdding(false);
                return r;
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full rounded-2xl border border-dashed border-kc-charcoal-3 py-4 text-sm text-kc-muted hover:text-kc-cream"
          >
            + Add ingredient
          </button>
        ))}
    </div>
  );
}

const input =
  "h-10 rounded-xl bg-kc-charcoal-3 px-3.5 text-sm text-kc-cream placeholder:text-kc-muted focus:outline-none focus:ring-2 focus:ring-kc-orange/50";

function QtyForm({
  label,
  hint,
  initial,
  withNote = false,
  onCancel,
  onSubmit,
}: {
  label: string;
  hint: string;
  initial?: number;
  withNote?: boolean;
  onCancel: () => void;
  onSubmit: (qty: number, note?: string) => Promise<ActionResult>;
}) {
  const [qty, setQty] = useState(initial !== undefined ? String(initial) : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await onSubmit(Number(qty), note);
    setBusy(false);
    if (r.ok) onCancel();
    else setError(r.error);
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2">
      <div className="text-xs text-kc-muted">
        {label} · {hint}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          autoFocus
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className={`${input} w-32`}
        />
        {withNote && (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className={`${input} flex-1 min-w-[140px]`}
          />
        )}
        <button
          disabled={busy || qty === ""}
          className="px-4 h-10 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white text-sm font-semibold disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="px-3 h-10 text-sm text-kc-muted hover:text-kc-cream">
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-kc-red">{error}</p>}
    </form>
  );
}

function IngredientForm({
  initial,
  onCancel,
  onSubmit,
  onDelete,
}: {
  initial?: Ingredient;
  onCancel: () => void;
  onSubmit: (input: { name: string; unit: string; low_threshold: number }) => Promise<ActionResult>;
  onDelete?: () => Promise<ActionResult>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [threshold, setThreshold] = useState(initial ? String(initial.low_threshold) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(fn: () => Promise<ActionResult>) {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (r.ok) onCancel();
    else setError(r.error);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        act(() => onSubmit({ name, unit, low_threshold: Number(threshold) }));
      }}
      className={initial ? "mt-4 space-y-2" : "space-y-2"}
    >
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Milk)" className={`${input} flex-1 min-w-[140px]`} />
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit (kg, L, g, pcs)" className={`${input} w-36`} />
        <input
          type="number"
          step="any"
          min="0"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder="Alert below"
          className={`${input} w-32`}
        />
      </div>
      <div className="flex gap-2">
        <button
          disabled={busy}
          className="px-4 h-10 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white text-sm font-semibold disabled:opacity-40"
        >
          {busy ? "Saving…" : initial ? "Save" : "Add ingredient"}
        </button>
        <button type="button" onClick={onCancel} className="px-3 h-10 text-sm text-kc-muted hover:text-kc-cream">
          Cancel
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={() => act(onDelete)}
            className="ml-auto px-3 h-10 text-sm text-kc-red hover:underline"
          >
            Delete
          </button>
        )}
      </div>
      {error && <p className="text-xs text-kc-red">{error}</p>}
    </form>
  );
}
