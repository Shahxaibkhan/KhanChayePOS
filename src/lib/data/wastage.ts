import "server-only";
import { supabase } from "@/lib/supabase";
import type { Wastage } from "@/lib/types";

export type WastageInput = {
  itemId: string | null;
  description: string;
  category: string;
  quantity: number;
  estimatedCost: number;
  wastageDate: string; // YYYY-MM-DD
  createdBy: string;
};

export async function listWastage(opts: { from?: string; to?: string } = {}): Promise<Wastage[]> {
  let query = supabase
    .from("wastage")
    .select("*")
    .order("wastage_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (opts.from) query = query.gte("wastage_date", opts.from);
  if (opts.to) query = query.lte("wastage_date", opts.to);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load wastage: ${error.message}`);
  return data ?? [];
}

export async function createWastage(input: WastageInput): Promise<Wastage> {
  const { data, error } = await supabase
    .from("wastage")
    .insert({
      item_id: input.itemId,
      description: input.description,
      category: input.category,
      quantity: input.quantity,
      estimated_cost: input.estimatedCost,
      wastage_date: input.wastageDate,
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to log wastage: ${error.message}`);
  return data;
}

export async function updateWastage(id: string, input: WastageInput): Promise<Wastage> {
  const { data, error } = await supabase
    .from("wastage")
    .update({
      item_id: input.itemId,
      description: input.description,
      category: input.category,
      quantity: input.quantity,
      estimated_cost: input.estimatedCost,
      wastage_date: input.wastageDate,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update wastage: ${error.message}`);
  return data;
}

export async function deleteWastage(id: string): Promise<void> {
  const { error } = await supabase.from("wastage").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete wastage entry: ${error.message}`);
}
