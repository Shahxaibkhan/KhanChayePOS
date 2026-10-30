import "server-only";
import { supabase } from "@/lib/supabase";
import type { Client } from "@/lib/types";

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("name", { ascending: true });
  if (error) throw new Error(`Failed to load clients: ${error.message}`);
  return data ?? [];
}

export type ClientInput = {
  name: string;
  phone: string | null;
  notes: string | null;
};

export async function createClient(input: ClientInput): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert({ name: input.name, phone: input.phone, notes: input.notes })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to create client: ${error.message}`);
  return data;
}

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .update({ name: input.name, phone: input.phone, notes: input.notes })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Failed to update client: ${error.message}`);
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete client: ${error.message}`);
}

/**
 * Looks up a client by name (case-insensitive, exact match) and returns it;
 * creates it if it doesn't exist yet. This is what lets staff just type a
 * client name on an order — no separate "add client" step required.
 */
export async function findOrCreateClient(rawName: string): Promise<Client> {
  const name = rawName.trim();

  const { data: existing, error: findError } = await supabase
    .from("clients")
    .select("*")
    .ilike("name", name)
    .maybeSingle();
  if (findError) throw new Error(`Failed to look up client: ${findError.message}`);
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("clients")
    .insert({ name })
    .select("*")
    .single();

  if (createError) {
    // Unique violation — someone else created the same client between our
    // lookup and insert (two staff typing the same name at once). Re-fetch
    // rather than erroring out.
    if (createError.code === "23505") {
      const { data: retry, error: retryError } = await supabase
        .from("clients")
        .select("*")
        .ilike("name", name)
        .maybeSingle();
      if (retryError || !retry) throw new Error(`Failed to resolve client "${name}".`);
      return retry;
    }
    throw new Error(`Failed to create client: ${createError.message}`);
  }

  return created;
}
