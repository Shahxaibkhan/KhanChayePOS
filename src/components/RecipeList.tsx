"use client";

import { useState } from "react";
import type { Ingredient, Item, RecipeRow } from "@/lib/types";
import { setRecipeAction } from "@/lib/actions/inventory-actions";
import { formatQty } from "@/lib/qty";

/** Admin: what one unit of each menu item uses, grouped by category. */
export default function RecipeList({
  items,
  ingredients,
  recipes,
}: {
  items: Item[];
  ingredients: Ingredient[];
  recipes: RecipeRow[];
}) {
  const [editing, setEditing] = useState<Item | null>(null);
  const byId = new Map(ingredients.map((g) => [g.id, g]));
  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="text-xs text-kc-muted uppercase tracking-[0.15em] mb-2">{cat}</h3>
          <div className="rounded-2xl bg-kc-charcoal-2 divide-y divide-kc-charcoal-3">
            {items
              .filter((i) => i.category === cat)
              .map((item) => {
                const rows = recipes.filter((r) => r.item_id === item.id);
                return (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-kc-cream">{item.name}</div>
                      <div className="text-xs text-kc-muted mt-0.5 truncate">
                        {rows.length
                          ? rows
                              .map((r) => {
                                const g = byId.get(r.ingredient_id);
                                return g ? `${g.name} ${formatQty(r.qty_per_unit, g.unit)}` : null;
                              })
                              .filter(Boolean)
                              .join(" · ")
                          : "No recipe — doesn't use stock"}
                      </div>
                    </div>
                    <button onClick={() => setEditing(item)} className="text-xs text-kc-gold-light hover:underline">
                      Edit
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {editing && (
        <RecipeModal
          item={editing}
          ingredients={ingredients}
          initial={recipes.filter((r) => r.item_id === editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function RecipeModal({
  item,
  ingredients,
  initial,
  onClose,
}: {
  item: Item;
  ingredients: Ingredient[];
  initial: RecipeRow[];
  onClose: () => void;
}) {
  const [rows, setRows] = useState(initial.map((r) => ({ ingredient_id: r.ingredient_id, qty: String(r.qty_per_unit) })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unused = ingredients.filter((g) => !rows.some((r) => r.ingredient_id === g.id));

  async function save() {
    setBusy(true);
    setError(null);
    const r = await setRecipeAction(
      item.id,
      rows.filter((r) => r.ingredient_id && r.qty !== "").map((r) => ({ ingredient_id: r.ingredient_id, qty_per_unit: Number(r.qty) }))
    );
    setBusy(false);
    if (r.ok) onClose();
    else setError(r.error);
  }

  const field =
    "h-10 rounded-xl bg-kc-charcoal-3 px-3 text-sm text-kc-cream focus:outline-none focus:ring-2 focus:ring-kc-orange/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-kc-charcoal rounded-3xl w-full max-w-lg p-6 shadow-2xl">
        <h3 className="font-display text-lg">{item.name}</h3>
        <p className="text-xs text-kc-muted mt-1 mb-5">How much one {item.name} uses. Deducted from stock on every order.</p>

        <div className="space-y-2">
          {rows.map((row, i) => {
            const g = ingredients.find((x) => x.id === row.ingredient_id);
            return (
              <div key={i} className="flex gap-2 items-center">
                <select
                  value={row.ingredient_id}
                  onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, ingredient_id: e.target.value } : r)))}
                  className={`${field} flex-1`}
                >
                  {g && <option value={g.id}>{g.name}</option>}
                  {unused.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={row.qty}
                  onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, qty: e.target.value } : r)))}
                  className={`${field} w-24`}
                />
                <span className="w-8 text-xs text-kc-muted">{g?.unit}</span>
                <button
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="text-kc-muted hover:text-kc-red text-sm px-1"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            );
          })}
          {unused.length > 0 && (
            <button
              onClick={() => setRows([...rows, { ingredient_id: unused[0].id, qty: "" }])}
              className="text-xs text-kc-gold-light hover:underline"
            >
              + Add ingredient
            </button>
          )}
        </div>

        {error && <p className="text-xs text-kc-red mt-4">{error}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-kc-charcoal-2 text-kc-muted hover:text-kc-cream text-sm">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 h-11 rounded-xl bg-gradient-to-br from-kc-orange to-kc-orange-2 text-white font-semibold text-sm disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}
