"use server";

import { revalidatePath } from "next/cache";
import { getRole, getStaffLabel } from "@/lib/session";
import {
  countIngredient,
  createIngredient,
  deleteIngredient,
  restockIngredient,
  setRecipe,
  updateIngredient,
  type IngredientInput,
} from "@/lib/data/inventory";

export type ActionResult = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath("/pos", "layout"); // low-stock bar lives in the POS layout
  revalidatePath("/admin/inventory");
}

async function run(fn: () => Promise<void>, adminOnly = false): Promise<ActionResult> {
  try {
    const role = await getRole();
    if (!role || (adminOnly && role !== "admin")) throw new Error("Not allowed.");
    await fn();
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

function positive(n: number, what: string) {
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${what} must be more than 0.`);
}

// Staff and admin: record a delivery, or a physical stock count.
export async function restockAction(id: string, qty: number, note?: string) {
  return run(async () => {
    positive(qty, "Quantity");
    await restockIngredient(id, qty, await getStaffLabel(), note?.trim() || undefined);
  });
}

export async function countAction(id: string, count: number) {
  return run(async () => {
    if (!Number.isFinite(count) || count < 0) throw new Error("Count can't be negative.");
    await countIngredient(id, count, await getStaffLabel());
  });
}

// Admin only: ingredient list and recipes.
function clean(input: IngredientInput): IngredientInput {
  const name = input.name.trim();
  const unit = input.unit.trim();
  if (!name) throw new Error("Name is required.");
  if (!unit) throw new Error("Unit is required (e.g. kg, L, g, pcs).");
  if (!Number.isFinite(input.low_threshold) || input.low_threshold < 0) throw new Error("Alert level can't be negative.");
  return { name, unit, low_threshold: input.low_threshold };
}

export async function createIngredientAction(input: IngredientInput) {
  return run(() => createIngredient(clean(input)), true);
}

export async function updateIngredientAction(id: string, input: IngredientInput) {
  return run(() => updateIngredient(id, clean(input)), true);
}

export async function deleteIngredientAction(id: string) {
  return run(() => deleteIngredient(id), true);
}

export async function setRecipeAction(itemId: string, rows: { ingredient_id: string; qty_per_unit: number }[]) {
  return run(async () => {
    for (const r of rows) positive(r.qty_per_unit, "Recipe amount");
    await setRecipe(itemId, rows);
  }, true);
}
