import "server-only";
import { supabase } from "@/lib/supabase";
import type { Item } from "@/lib/types";

export async function listItems(opts: { includeInactive?: boolean } = {}): Promise<Item[]> {
  let query = supabase
    .from("items")
    .select("*")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!opts.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load items: ${error.message}`);
  return data ?? [];
}

export type ItemInput = {
  name: string;
  category: string;
  price: number;
  cost: number;
  sortOrder: number;
  isActive: boolean;
};

export async function createItem(input: ItemInput): Promise<Item> {
  const { data, error } = await supabase
    .from("items")
    .insert({
      name: input.name,
      category: input.category,
      price: input.price,
      cost: input.cost,
      sort_order: input.sortOrder,
      is_active: input.isActive,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create item: ${error.message}`);
  return data;
}

export async function updateItem(id: string, input: ItemInput): Promise<Item> {
  const { data, error } = await supabase
    .from("items")
    .update({
      name: input.name,
      category: input.category,
      price: input.price,
      cost: input.cost,
      sort_order: input.sortOrder,
      is_active: input.isActive,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update item: ${error.message}`);
  return data;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete item: ${error.message}`);
}
