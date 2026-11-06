import "server-only";
import { supabase } from "@/lib/supabase";
import type { Ingredient, RecipeRow } from "@/lib/types";

/** Codes PostgREST returns when a table/function doesn't exist yet (sql/008_inventory.sql not run). */
const MISSING_CODES = new Set(["PGRST205", "42P01", "PGRST202", "42883"]);

function missing(error: { code?: string } | null): boolean {
  if (error && MISSING_CODES.has(error.code ?? "")) {
    console.error("inventory tables not found — run sql/008_inventory.sql in Supabase.");
    return true;
  }
  return false;
}

export async function listIngredients(): Promise<Ingredient[]> {
  const { data, error } = await supabase.from("ingredients").select("*").order("name");
  if (missing(error)) return [];
  if (error) throw new Error(`Failed to load inventory: ${error.message}`);
  return (data ?? []).map((g) => ({ ...g, stock: Number(g.stock), low_threshold: Number(g.low_threshold) }));
}

export function isLow(g: Ingredient): boolean {
  return g.stock <= g.low_threshold;
}

/** For the POS warning bar — never throws, so a stock hiccup can't take the POS down. */
export async function listLowStock(): Promise<Ingredient[]> {
  try {
    return (await listIngredients()).filter(isLow);
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function listRecipes(): Promise<RecipeRow[]> {
  const { data, error } = await supabase.from("recipes").select("*");
  if (missing(error)) return [];
  if (error) throw new Error(`Failed to load recipes: ${error.message}`);
  return (data ?? []).map((r) => ({ ...r, qty_per_unit: Number(r.qty_per_unit) }));
}

export type IngredientInput = { name: string; unit: string; low_threshold: number };

export async function createIngredient(input: IngredientInput): Promise<void> {
  const { error } = await supabase.from("ingredients").insert(input);
  if (error) throw new Error(`Failed to add ingredient: ${error.message}`);
}

export async function updateIngredient(id: string, input: IngredientInput): Promise<void> {
  const { error } = await supabase.from("ingredients").update(input).eq("id", id);
  if (error) throw new Error(`Failed to update ingredient: ${error.message}`);
}

export async function deleteIngredient(id: string): Promise<void> {
  const { error } = await supabase.from("ingredients").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete ingredient: ${error.message}`);
}

export async function restockIngredient(id: string, qty: number, by: string, note?: string): Promise<void> {
  const { error } = await supabase.rpc("restock_ingredient", { p_id: id, p_qty: qty, p_by: by, p_note: note ?? null });
  if (error) throw new Error(`Failed to restock: ${error.message}`);
}

export async function countIngredient(id: string, count: number, by: string): Promise<void> {
  const { error } = await supabase.rpc("count_ingredient", { p_id: id, p_count: count, p_by: by });
  if (error) throw new Error(`Failed to save stock count: ${error.message}`);
}

/** Replaces one menu item's recipe. */
export async function setRecipe(itemId: string, rows: { ingredient_id: string; qty_per_unit: number }[]): Promise<void> {
  const { error: delError } = await supabase.from("recipes").delete().eq("item_id", itemId);
  if (delError) throw new Error(`Failed to update recipe: ${delError.message}`);
  if (!rows.length) return;
  const { error } = await supabase.from("recipes").insert(rows.map((r) => ({ ...r, item_id: itemId })));
  if (error) throw new Error(`Failed to update recipe: ${error.message}`);
}

export type StockMovement = {
  id: string;
  change: number;
  reason: "restock" | "count";
  note: string | null;
  created_by: string | null;
  created_at: string;
  ingredients: { name: string; unit: string } | null;
};

export async function listMovements(limit = 30): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from("stock_movements")
    .select("id, change, reason, note, created_by, created_at, ingredients(name, unit)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (missing(error)) return [];
  if (error) throw new Error(`Failed to load stock history: ${error.message}`);
  return ((data ?? []) as unknown as StockMovement[]).map((m) => ({ ...m, change: Number(m.change) }));
}
